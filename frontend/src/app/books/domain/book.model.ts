/** A book as stored in the inventory. */
export interface Book {
  readonly id: number;
  readonly title: string;
  readonly author: string;
  readonly isbn: string;
  /** Acquisition cost in USD. */
  readonly costUsd: number;
  /** Last calculated selling price in the local currency; `null` until it is calculated. */
  readonly sellingPriceLocal: number | null;
  readonly stockQuantity: number;
  readonly category: string;
  /** ISO 3166-1 alpha-2 code, uppercase. */
  readonly supplierCountry: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The writable subset of a book, used for create and full update. */
export interface BookDraft {
  readonly title: string;
  readonly author: string;
  readonly isbn: string;
  readonly costUsd: number;
  readonly stockQuantity: number;
  readonly category: string;
  readonly supplierCountry: string;
}

/** Stock level at or below which a book is considered low on stock by default. */
export const LOW_STOCK_THRESHOLD = 10;

export function isLowStock(book: Pick<Book, 'stockQuantity'>, threshold = LOW_STOCK_THRESHOLD): boolean {
  return book.stockQuantity <= threshold;
}

/** Field limits mirrored from the backend contract, shared by forms and tests. */
export const BOOK_LIMITS = {
  title: 255,
  author: 255,
  isbn: 17,
  category: 100,
  /** `max_digits` of the backend decimal field, including the decimals. */
  costMaxDigits: 10,
  costDecimals: 2,
  supplierCountry: 2,
} as const;
