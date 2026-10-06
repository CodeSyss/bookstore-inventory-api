import { Book } from '../domain/book.model';
import { Page } from '../domain/page.model';
import { PriceCalculation } from '../domain/price-calculation.model';

/** Builders for test data; every field can be overridden. */
export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1,
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '978-84-376-0494-7',
    costUsd: 12.5,
    sellingPriceLocal: null,
    stockQuantity: 25,
    category: 'Novela',
    supplierCountry: 'CO',
    createdAt: '2026-01-10T12:00:00Z',
    updatedAt: '2026-01-10T12:00:00Z',
    ...overrides,
  };
}

export function makePage(items: readonly Book[], overrides: Partial<Page<Book>> = {}): Page<Book> {
  return { items, total: items.length, hasNext: false, hasPrevious: false, ...overrides };
}

export function makeCalculation(overrides: Partial<PriceCalculation> = {}): PriceCalculation {
  return {
    bookId: 1,
    costUsd: 12.5,
    exchangeRate: 0.92,
    costLocal: 11.5,
    marginPercentage: 40,
    sellingPriceLocal: 16.1,
    currency: 'EUR',
    rateSource: 'live',
    calculatedAt: '2026-01-10T12:30:00Z',
    ...overrides,
  };
}
