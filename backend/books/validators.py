import re
from django.core.exceptions import ValidationError


def normalize_isbn(value: str) -> str:
    """Quita guiones y espacios, y pone la X en mayúscula."""
    return re.sub(r"[\s-]", "", value or "").upper()


def _is_valid_isbn10(isbn: str) -> bool:
    if not re.fullmatch(r"\d{9}[\dX]", isbn):
        return False
    total = sum((10 - i) * (10 if c == "X" else int(c)) for i, c in enumerate(isbn))
    return total % 11 == 0


def _is_valid_isbn13(isbn: str) -> bool:
    if not re.fullmatch(r"\d{13}", isbn):
        return False
    total = sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(isbn))
    return total % 10 == 0


def validate_isbn(value: str) -> None:
    isbn = normalize_isbn(value)
    if len(isbn) == 10 and _is_valid_isbn10(isbn):
        return
    if len(isbn) == 13 and _is_valid_isbn13(isbn):
        return
    raise ValidationError("ISBN inválido. Debe tener 10 o 13 dígitos válidos.")
