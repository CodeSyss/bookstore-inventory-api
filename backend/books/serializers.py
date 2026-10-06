from rest_framework import serializers

from .models import Book, normalized_isbn_expression
from .validators import normalize_isbn


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id", "title", "author", "isbn", "cost_usd", "selling_price_local",
            "stock_quantity", "category", "supplier_country", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "selling_price_local", "created_at", "updated_at"]

    def validate_isbn(self, value: str) -> str:
        # DRF does not run expression-based UniqueConstraints, so duplicates are
        # checked here on the normalized ISBN ("978-84-..." == "97884...").
        duplicates = Book.objects.annotate(normalized=normalized_isbn_expression()).filter(
            normalized=normalize_isbn(value)
        )
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Ya existe un libro con este ISBN.")
        return value

    def validate_supplier_country(self, value: str) -> str:
        if len(value) != 2 or not value.isalpha():
            raise serializers.ValidationError("Debe ser un código de país de 2 letras (ej. ES).")
        return value.upper()


class PriceCalculationSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    cost_usd = serializers.DecimalField(max_digits=10, decimal_places=2)
    exchange_rate = serializers.DecimalField(max_digits=14, decimal_places=6)
    cost_local = serializers.DecimalField(max_digits=12, decimal_places=2)
    margin_percentage = serializers.IntegerField()
    selling_price_local = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField()
    rate_source = serializers.CharField()
    calculation_timestamp = serializers.DateTimeField()
