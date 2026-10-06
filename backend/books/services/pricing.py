from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.utils import timezone

from books.models import Book

from .exchange_rate import get_usd_rate

MARGIN_PERCENTAGE = Decimal("40")
CENT = Decimal("0.01")


def calculate_selling_price(book: Book) -> dict:
    currency = settings.LOCAL_CURRENCY
    rate, source = get_usd_rate(currency)

    cost_local = (book.cost_usd * rate).quantize(CENT, ROUND_HALF_UP)
    selling_price = (cost_local * (1 + MARGIN_PERCENTAGE / 100)).quantize(CENT, ROUND_HALF_UP)

    book.selling_price_local = selling_price
    book.save(update_fields=["selling_price_local", "updated_at"])

    return {
        "book_id": book.id,
        "cost_usd": book.cost_usd,
        "exchange_rate": rate,
        "cost_local": cost_local,
        "margin_percentage": int(MARGIN_PERCENTAGE),
        "selling_price_local": selling_price,
        "currency": currency,
        "rate_source": source,
        "calculation_timestamp": timezone.now(),
    }
