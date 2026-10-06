import { Book, BookDraft } from '../domain/book.model';
import { Page } from '../domain/page.model';
import { PriceCalculation, RateSource } from '../domain/price-calculation.model';

/** Wire formats of the Django REST API, and their mapping to/from the domain model. */

export interface BookDto {
  id: number;
  title: string;
  author: string;
  isbn: string;
  cost_usd: number | string;
  selling_price_local: number | string | null;
  stock_quantity: number;
  category: string;
  supplier_country: string;
  created_at: string;
  updated_at: string;
}

export interface BookWriteDto {
  title: string;
  author: string;
  isbn: string;
  cost_usd: number;
  stock_quantity: number;
  category: string;
  supplier_country: string;
}

export interface PageDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PriceCalculationDto {
  book_id: number;
  cost_usd: number | string;
  exchange_rate: number | string;
  cost_local: number | string;
  margin_percentage: number | string;
  selling_price_local: number | string;
  currency: string;
  rate_source: RateSource;
  calculation_timestamp: string;
}

/** Decimals are JSON numbers, but tolerate decimal strings should the serializer change. */
function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function toBook(dto: BookDto): Book {
  return {
    id: dto.id,
    title: dto.title,
    author: dto.author,
    isbn: dto.isbn,
    costUsd: toNumber(dto.cost_usd),
    sellingPriceLocal: dto.selling_price_local === null ? null : toNumber(dto.selling_price_local),
    stockQuantity: dto.stock_quantity,
    category: dto.category,
    supplierCountry: dto.supplier_country,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function toBookWriteDto(draft: BookDraft): BookWriteDto {
  return {
    title: draft.title,
    author: draft.author,
    isbn: draft.isbn,
    cost_usd: draft.costUsd,
    stock_quantity: draft.stockQuantity,
    category: draft.category,
    supplier_country: draft.supplierCountry,
  };
}

export function toBookPage(dto: PageDto<BookDto>): Page<Book> {
  return {
    items: dto.results.map(toBook),
    total: dto.count,
    hasNext: dto.next !== null,
    hasPrevious: dto.previous !== null,
  };
}

export function toPriceCalculation(dto: PriceCalculationDto): PriceCalculation {
  return {
    bookId: dto.book_id,
    costUsd: toNumber(dto.cost_usd),
    exchangeRate: toNumber(dto.exchange_rate),
    costLocal: toNumber(dto.cost_local),
    marginPercentage: toNumber(dto.margin_percentage),
    sellingPriceLocal: toNumber(dto.selling_price_local),
    currency: dto.currency,
    rateSource: dto.rate_source,
    calculatedAt: dto.calculation_timestamp,
  };
}
