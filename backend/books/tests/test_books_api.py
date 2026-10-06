from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
import requests
from rest_framework.test import APIClient

from books.models import Book

VALID = {
    "title": "El Quijote",
    "author": "Miguel de Cervantes",
    "isbn": "978-84-376-0494-7",
    "cost_usd": "15.99",
    "stock_quantity": 25,
    "category": "Literatura Clásica",
    "supplier_country": "ES",
}


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def book(db):
    return Book.objects.create(**{**VALID, "isbn": "9788437604947"})


def mock_rates(mock_get, payload):
    mock_get.return_value = Mock(status_code=200, json=lambda: payload)
    mock_get.return_value.raise_for_status = Mock()


@pytest.mark.django_db
class TestCrud:
    def test_create_keeps_isbn_format_and_numeric_decimals(self, client):
        r = client.post("/books", VALID, format="json")
        assert r.status_code == 201
        body = r.json()
        assert body["isbn"] == "978-84-376-0494-7"
        assert body["cost_usd"] == 15.99
        assert body["selling_price_local"] is None

    def test_create_with_form_data(self, client):
        r = client.post("/books", VALID)
        assert r.status_code == 201
        assert r.json()["title"] == "El Quijote"

    @pytest.mark.parametrize("isbn", ["9788437604947", "978-84-376-0494-7", "978 84 376 0494 7"])
    def test_duplicate_isbn_in_any_format(self, client, book, isbn):
        r = client.post("/books", {**VALID, "isbn": isbn}, format="json")
        assert r.status_code == 400
        assert "isbn" in r.json()["details"]

    @pytest.mark.parametrize("field,value", [
        ("cost_usd", "0"), ("stock_quantity", -1), ("isbn", "123"), ("isbn", "9788437604940"),
        ("supplier_country", "E1"),
    ])
    def test_business_rules(self, client, field, value):
        r = client.post("/books", {**VALID, field: value}, format="json")
        assert r.status_code == 400
        body = r.json()
        assert body["error"] == "validation_error"
        assert field in body["details"]

    def test_list_paginated(self, client, book):
        r = client.get("/books")
        assert r.status_code == 200
        assert r.json()["count"] == 1

    def test_not_found(self, client):
        r = client.get("/books/999")
        assert r.status_code == 404
        assert r.json()["error"] == "not_found"
        assert r.json()["message"] == "No se encontró el recurso solicitado."

    def test_builtin_validation_messages_are_spanish(self, client):
        r = client.post("/books", {**VALID, "cost_usd": "0"}, format="json")
        assert r.json()["details"]["cost_usd"] == ["Asegúrese de que este valor es mayor o igual a 0.01."]

    def test_update_same_isbn_and_delete(self, client, book):
        r = client.put(f"/books/{book.id}", {**VALID, "stock_quantity": 3}, format="json")
        assert r.status_code == 200 and r.json()["stock_quantity"] == 3
        assert client.delete(f"/books/{book.id}").status_code == 204
        assert client.get(f"/books/{book.id}").status_code == 404

    def test_update_to_isbn_of_another_book(self, client, book):
        other = Book.objects.create(**{**VALID, "isbn": "0-306-40615-2"})
        r = client.put(f"/books/{other.id}", VALID, format="json")
        assert r.status_code == 400
        assert "isbn" in r.json()["details"]

    def test_search_and_low_stock(self, client, book):
        assert client.get("/books/search", {"category": "literatura clásica"}).json()["count"] == 1
        assert client.get("/books/search").status_code == 400
        assert client.get("/books/low-stock", {"threshold": 10}).json()["count"] == 0
        assert client.get("/books/low-stock", {"threshold": 30}).json()["count"] == 1
        assert client.get("/books/low-stock", {"threshold": "x"}).status_code == 400


@pytest.mark.django_db
class TestCalculatePrice:
    @patch("books.services.exchange_rate.requests.get")
    def test_live_rate_matches_spec_example(self, mock_get, client, book):
        mock_rates(mock_get, {"rates": {"EUR": 0.85}})
        r = client.post(f"/books/{book.id}/calculate-price")
        assert r.status_code == 200
        body = r.json()
        assert body["book_id"] == book.id
        assert body["cost_usd"] == 15.99
        assert body["exchange_rate"] == 0.85
        assert body["cost_local"] == 13.59
        assert body["margin_percentage"] == 40
        assert body["selling_price_local"] == 19.03
        assert body["currency"] == "EUR"
        assert body["rate_source"] == "live"
        book.refresh_from_db()
        assert book.selling_price_local == Decimal("19.03")
        # The calculation timestamp is the persisted update time of the book.
        assert client.get(f"/books/{book.id}").json()["updated_at"] == body["calculation_timestamp"]

    @patch("books.services.exchange_rate.requests.get", side_effect=requests.ConnectionError)
    def test_fallback_rate_when_api_down(self, _, client, book):
        r = client.post(f"/books/{book.id}/calculate-price")
        assert r.status_code == 200
        assert r.json()["rate_source"] == "fallback"

    @pytest.mark.parametrize("payload", [{"rates": {"EUR": "n/a"}}, {"rates": {}}, {"rates": {"EUR": 0}}])
    @patch("books.services.exchange_rate.requests.get")
    def test_fallback_rate_on_bad_payload(self, mock_get, payload, client, book):
        mock_rates(mock_get, payload)
        r = client.post(f"/books/{book.id}/calculate-price")
        assert r.status_code == 200
        assert r.json()["rate_source"] == "fallback"

    @patch("books.services.exchange_rate.requests.get", side_effect=requests.Timeout)
    def test_503_without_default(self, _, client, book, settings):
        settings.DEFAULT_EXCHANGE_RATE = ""
        r = client.post(f"/books/{book.id}/calculate-price")
        assert r.status_code == 503
        body = r.json()
        assert body["error"] == "service_unavailable"
        assert set(body) == {"status", "error", "message", "details"}

    def test_404_for_missing_book(self, client, db):
        assert client.post("/books/999/calculate-price").status_code == 404
