import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { integerNumber } from '../../shared/validators/number-validators';
import { BOOK_LIMITS, LOW_STOCK_THRESHOLD } from '../domain/book.model';
import { BookFilter, NO_FILTER } from '../domain/book-filter.model';

type FilterMode = BookFilter['kind'];

/**
 * Filter controls for the catalog: all books, an exact category, or a low-stock threshold.
 * Emits a {@link BookFilter}; applying is explicit except for "all" and the low-stock quick view.
 */
@Component({
  selector: 'app-book-filter-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './book-filter-panel.html',
  styleUrl: './book-filter-panel.scss',
})
export class BookFilterPanel {
  /** The filter currently applied by the container; the panel mirrors it. */
  readonly filter = input<BookFilter>(NO_FILTER);
  readonly filterChange = output<BookFilter>();

  protected readonly categoryMaxLength = BOOK_LIMITS.category;

  protected readonly mode = signal<FilterMode>('all');

  protected readonly form = new FormGroup({
    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(BOOK_LIMITS.category)],
    }),
    threshold: new FormControl<number | null>(LOW_STOCK_THRESHOLD, {
      validators: [Validators.required, Validators.min(0), integerNumber()],
    }),
  });

  constructor() {
    effect(() => {
      const filter = this.filter();
      untracked(() => {
        this.mode.set(filter.kind);
        if (filter.kind === 'category') this.form.patchValue({ category: filter.category });
        if (filter.kind === 'low-stock') this.form.patchValue({ threshold: filter.threshold });
      });
    });
  }

  protected onModeChange(mode: FilterMode): void {
    this.mode.set(mode);
    // "All" and the low-stock quick view need no further input, so they apply right away.
    if (mode === 'all' || (mode === 'low-stock' && this.form.controls.threshold.valid)) {
      this.apply();
    }
  }

  protected apply(): void {
    const { category, threshold } = this.form.controls;
    switch (this.mode()) {
      case 'all':
        this.filterChange.emit(NO_FILTER);
        return;
      case 'category': {
        category.markAsTouched();
        const value = category.value.trim();
        if (category.invalid || value === '') {
          category.setErrors({ required: true });
          return;
        }
        this.filterChange.emit({ kind: 'category', category: value });
        return;
      }
      case 'low-stock':
        threshold.markAsTouched();
        if (threshold.invalid || threshold.value === null) return;
        this.filterChange.emit({ kind: 'low-stock', threshold: threshold.value });
        return;
    }
  }

  protected clear(): void {
    this.mode.set('all');
    this.form.patchValue({ category: '', threshold: LOW_STOCK_THRESHOLD });
    this.filterChange.emit(NO_FILTER);
  }
}
