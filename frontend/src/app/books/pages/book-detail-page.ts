import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { attempt } from '../../core/http/attempt';
import { NotificationService } from '../../core/notifications/notification-service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingButton } from '../../shared/ui/loading-button';
import { BooksStore } from '../application/books-store';
import { PriceBreakdown } from '../ui/price-breakdown';
import { StockBadge } from '../ui/stock-badge';

/** Container for one book: details, edit/delete actions and the price calculation module. */
@Component({
  selector: 'app-book-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    EmptyState,
    LoadingButton,
    PriceBreakdown,
    StockBadge,
  ],
  templateUrl: './book-detail-page.html',
  styleUrl: './book-detail-page.scss',
})
export class BookDetailPage {
  protected readonly store = inject(BooksStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  /** Route parameter `:id`, bound through component input binding. */
  readonly id = input.required<string>();

  protected readonly bookId = computed(() => {
    const parsed = Number(this.id());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  protected readonly currentBook = computed(() => {
    const current = this.store.current();
    return current && current.id === this.bookId() ? current : null;
  });

  protected readonly calculation = computed(() => {
    const id = this.bookId();
    return id === null ? undefined : this.store.calculations().get(id);
  });

  protected readonly calculating = computed(() => {
    const id = this.bookId();
    return id !== null && this.store.calculatingIds().has(id);
  });

  protected readonly deleting = computed(() => {
    const id = this.bookId();
    return id !== null && this.store.deletingIds().has(id);
  });

  protected readonly notFound = computed(() => this.bookId() === null || this.store.currentNotFound());

  constructor() {
    effect(() => {
      const id = this.bookId();
      if (id !== null) untracked(() => void this.store.loadBook(id));
    });
  }

  protected async calculatePrice(): Promise<void> {
    const id = this.bookId();
    if (id === null) return;

    const result = await attempt(this.store.calculatePrice(id));
    if (!result.ok) return;
    if (result.value.rateSource === 'fallback') {
      this.notifications.warning('Precio calculado con la tasa de cambio por defecto.');
    } else {
      this.notifications.success('Precio de venta calculado.');
    }
  }

  protected async remove(): Promise<void> {
    const book = this.currentBook();
    if (!book) return;

    const confirmed = await this.confirm.ask({
      title: 'Eliminar libro',
      message: `¿Seguro que deseas eliminar «${book.title}»? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;

    const result = await attempt(this.store.remove(book.id));
    if (!result.ok) return;
    this.notifications.success(`Se eliminó «${book.title}».`);
    await this.router.navigate(['/books']);
  }
}
