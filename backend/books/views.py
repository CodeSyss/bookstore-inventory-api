from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response

from .models import Book
from .serializers import BookSerializer, PriceCalculationSerializer
from .services.exchange_rate import ExchangeRateUnavailable
from .services.pricing import calculate_selling_price


class ExchangeServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Servicio de tasas de cambio no disponible."
    default_code = "service_unavailable"


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    http_method_names = ["get", "post", "put", "delete"]

    def perform_create(self, serializer):
        self._save_unique(serializer)

    def perform_update(self, serializer):
        self._save_unique(serializer)

    def _save_unique(self, serializer):
        # Last line of defense: a concurrent request may insert the same ISBN
        # between validation and save; the DB constraint catches it -> 400, not 500.
        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError({"isbn": ["Ya existe un libro con este ISBN."]})

    def _paginated(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        category = request.query_params.get("category", "").strip()
        if not category:
            raise ValidationError({"category": "Este parámetro es obligatorio."})
        return self._paginated(self.get_queryset().filter(category__iexact=category))

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        raw = request.query_params.get("threshold", "10")
        try:
            threshold = int(raw)
            if threshold < 0:
                raise ValueError
        except ValueError:
            raise ValidationError({"threshold": "Debe ser un entero mayor o igual a 0."})
        return self._paginated(self.get_queryset().filter(stock_quantity__lte=threshold))

    @action(detail=True, methods=["post"], url_path="calculate-price")
    def calculate_price(self, request, pk=None):
        book = self.get_object()
        try:
            data = calculate_selling_price(book)
        except ExchangeRateUnavailable:
            raise ExchangeServiceUnavailable()
        return Response(PriceCalculationSerializer(data).data)
