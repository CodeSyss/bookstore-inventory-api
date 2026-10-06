from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Value
from django.db.models.functions import Replace, Upper

from .validators import validate_isbn

# 13 digits + up to 4 hyphens, e.g. "978-84-376-0494-7".
ISBN_MAX_LENGTH = 17


def normalized_isbn_expression():
    """DB-side equivalent of normalize_isbn: strip hyphens/spaces, uppercase."""
    return Upper(
        Replace(Replace(F("isbn"), Value("-"), Value("")), Value(" "), Value(""))
    )


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    # Stored as provided (hyphens allowed) so responses keep the original format;
    # uniqueness is enforced on the normalized value (see Meta.constraints).
    isbn = models.CharField(max_length=ISBN_MAX_LENGTH, validators=[validate_isbn])
    cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    selling_price_local = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=100, db_index=True)
    supplier_country = models.CharField(max_length=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                normalized_isbn_expression(),
                name="unique_book_normalized_isbn",
                violation_error_message="Ya existe un libro con este ISBN.",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.isbn})"
