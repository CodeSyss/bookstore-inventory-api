import { Observable } from 'rxjs';

import { Book, BookDraft } from './book.model';
import { BookFilter } from './book-filter.model';
import { Page } from './page.model';
import { PriceCalculation } from './price-calculation.model';

export interface BookListQuery {
  readonly filter: BookFilter;
  /** 1-based page number. */
  readonly page: number;
}

/**
 * Port through which the application layer reaches the book inventory.
 * Declared as an abstract class so it doubles as a DI token.
 */
export abstract class BooksRepository {
  abstract list(query: BookListQuery): Observable<Page<Book>>;
  abstract get(id: number): Observable<Book>;
  abstract create(draft: BookDraft): Observable<Book>;
  abstract update(id: number, draft: BookDraft): Observable<Book>;
  abstract remove(id: number): Observable<void>;
  abstract calculatePrice(id: number): Observable<PriceCalculation>;
}
