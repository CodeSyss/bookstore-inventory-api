import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';

import { FieldErrors } from '../../core/http/api-error';
import { attempt } from '../../core/http/attempt';
import { NotificationService } from '../../core/notifications/notification-service';
import { EmptyState } from '../../shared/ui/empty-state';
import { BooksStore } from '../application/books-store';
import { BookDraft } from '../domain/book.model';
import { BookForm } from '../ui/book-form';

/** Container for the create (`/books/new`) and edit (`/books/:id/edit`) screens. */
@Component({
  selector: 'app-book-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, BookForm, EmptyState],
  templateUrl: './book-form-page.html',
  styleUrl: './book-form-page.scss',
})
export class BookFormPage {
  private readonly store = inject(BooksStore);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  /** Route parameter `:id`; absent on the creation route. */
  readonly id = input<string>();

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<FieldErrors | null>(null);

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly bookId = computed(() => {
    const raw = this.id();
    if (raw === undefined) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  protected readonly loading = this.store.currentLoading;
  protected readonly notFound = computed(
    () => this.isEdit() && (this.bookId() === null || this.store.currentNotFound()),
  );
  protected readonly book = computed(() => {
    const current = this.store.current();
    return current && current.id === this.bookId() ? current : null;
  });

  protected readonly backLink = computed(() => {
    const id = this.bookId();
    return id === null ? ['/books'] : ['/books', id];
  });

  constructor() {
    effect(() => {
      const id = this.bookId();
      if (id !== null) untracked(() => void this.store.loadBook(id));
    });
  }

  protected async save(draft: BookDraft): Promise<void> {
    this.serverErrors.set(null);
    this.saving.set(true);

    const id = this.bookId();
    const result = await attempt(id === null ? this.store.create(draft) : this.store.update(id, draft));
    this.saving.set(false);

    if (!result.ok) {
      this.serverErrors.set(result.error.details);
      return;
    }

    this.notifications.success(id === null ? 'Libro creado correctamente.' : 'Cambios guardados correctamente.');
    await this.router.navigate(['/books', result.value.id]);
  }

  protected cancel(): void {
    void this.router.navigate(this.backLink());
  }
}
