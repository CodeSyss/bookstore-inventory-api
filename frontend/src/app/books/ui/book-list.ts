import { BreakpointObserver } from '@angular/cdk/layout';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { map } from 'rxjs';

import { Book } from '../domain/book.model';
import { BookRowActions } from './book-row-actions';
import { StockBadge } from './stock-badge';

/** Below this width the table is replaced by a stacked card list. */
const NARROW_QUERY = '(max-width: 899.98px)';

/**
 * Presentational catalog view: a Material table on wide screens, cards on narrow ones.
 * Holds no state besides the viewport; everything comes in through inputs.
 */
@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, MatTableModule, MatCardModule, BookRowActions, StockBadge],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookList {
  readonly books = input.required<readonly Book[]>();
  /** Currency code of `sellingPriceLocal`. */
  readonly currency = input.required<string>();
  readonly calculatingIds = input<ReadonlySet<number>>(new Set());
  readonly deletingIds = input<ReadonlySet<number>>(new Set());
  /** Dims the rows while a new page or filter is loading. */
  readonly busy = input(false);

  readonly calculate = output<Book>();
  readonly view = output<Book>();
  readonly edit = output<Book>();
  readonly remove = output<Book>();

  protected readonly columns = ['title', 'isbn', 'category', 'cost', 'price', 'stock', 'actions'] as const;

  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly trackById = (_: number, book: Book): number => book.id;
}
