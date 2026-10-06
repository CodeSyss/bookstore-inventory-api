import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { attempt } from '../../core/http/attempt';
import { NotificationService } from '../../core/notifications/notification-service';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { BooksStore } from '../application/books-store';
import { Book } from '../domain/book.model';
import { BookFilter } from '../domain/book-filter.model';
import { BookFilterPanel } from '../ui/book-filter-panel';
import { BookList } from '../ui/book-list';
import { PriceBreakdownDialog, PriceBreakdownDialogData } from '../ui/price-breakdown-dialog';

/** Container for the inventory dashboard: wires the store to the presentational components. */
@Component({
  selector: 'app-inventory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    BookFilterPanel,
    BookList,
    EmptyState,
  ],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.scss',
})
export class InventoryPage {
  protected readonly store = inject(BooksStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  protected readonly summary = computed(() => {
    const total = this.store.total();
    const books = `${total} ${total === 1 ? 'libro' : 'libros'}`;
    const filter = this.store.filter();
    switch (filter.kind) {
      case 'category':
        return `${books} en la categoría «${filter.category}»`;
      case 'low-stock':
        return `${books} con stock menor o igual a ${filter.threshold}`;
      case 'all':
        return `${books} en el inventario`;
    }
  });

  constructor() {
    // Always refresh when entering the dashboard so it never shows stale data.
    void this.store.load();
  }

  protected applyFilter(filter: BookFilter): void {
    void this.store.setFilter(filter);
  }

  protected changePage(event: PageEvent): void {
    void this.store.changePage(event.pageIndex + 1);
  }

  protected reload(): void {
    void this.store.load();
  }

  protected clearFilter(): void {
    void this.store.clearFilter();
  }

  protected openDetail(book: Book): void {
    void this.router.navigate(['/books', book.id]);
  }

  protected openEdit(book: Book): void {
    void this.router.navigate(['/books', book.id, 'edit']);
  }

  protected async calculatePrice(book: Book): Promise<void> {
    const result = await attempt(this.store.calculatePrice(book.id));
    if (!result.ok) return;

    const calculation = result.value;
    if (calculation.rateSource === 'fallback') {
      this.notifications.warning('Precio calculado con la tasa de cambio por defecto.');
    } else {
      this.notifications.success('Precio de venta calculado.');
    }

    const data: PriceBreakdownDialogData = { bookTitle: book.title, calculation };
    this.dialog.open(PriceBreakdownDialog, { data, width: '480px', maxWidth: '92vw', autoFocus: false });
  }

  protected async remove(book: Book): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Eliminar libro',
      message: `¿Seguro que deseas eliminar «${book.title}»? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;

    const result = await attempt(this.store.remove(book.id));
    if (result.ok) this.notifications.success(`Se eliminó «${book.title}».`);
  }
}
