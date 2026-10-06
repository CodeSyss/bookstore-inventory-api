import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ExchangeRateUnavailable(Exception):
    """La API falló y no hay tasa por defecto configurada."""


def get_usd_rate(currency: str) -> tuple[Decimal, str]:
    """Devuelve (tasa USD→currency, origen). Origen: 'live' o 'fallback'."""
    try:
        response = requests.get(
            settings.EXCHANGE_API_URL, timeout=settings.EXCHANGE_API_TIMEOUT
        )
        response.raise_for_status()
        rate = Decimal(str(response.json()["rates"][currency]))
        if rate <= 0:
            raise ValueError(f"non-positive rate: {rate}")
        return rate, "live"
    except (requests.RequestException, KeyError, ValueError, TypeError, InvalidOperation) as exc:
        logger.warning("Exchange API failed (%s). Using default rate.", exc)

    if not settings.DEFAULT_EXCHANGE_RATE:
        raise ExchangeRateUnavailable()
    return Decimal(str(settings.DEFAULT_EXCHANGE_RATE)), "fallback"
