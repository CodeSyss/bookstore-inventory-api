from django.contrib import admin

from .models import Book


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "isbn", "category", "stock_quantity", "cost_usd", "selling_price_local")
    list_filter = ("category", "supplier_country")
    search_fields = ("title", "author", "isbn")
