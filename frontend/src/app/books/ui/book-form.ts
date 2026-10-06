import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FieldErrors } from '../../core/http/api-error';
import { isbnValidator } from '../../shared/validators/isbn-validator';
import { integerNumber, maxDecimals, maxIntegerDigits, positiveNumber } from '../../shared/validators/number-validators';
import { BOOK_LIMITS, Book, BookDraft } from '../domain/book.model';

/** API field names (snake_case) mapped to the form control that edits them. */
const CONTROL_BY_API_FIELD: Readonly<Record<string, string>> = {
  title: 'title',
  author: 'author',
  isbn: 'isbn',
  cost_usd: 'costUsd',
  stock_quantity: 'stockQuantity',
  category: 'category',
  supplier_country: 'supplierCountry',
};

/**
 * Validated form to create or edit a book. Presentational: it receives the book to edit
 * and server-side validation errors, and emits a valid {@link BookDraft} on submit.
 */
@Component({
  selector: 'app-book-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './book-form.html',
  styleUrl: './book-form.scss',
})
export class BookForm {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  /** Book being edited; `null` for the creation form. */
  readonly book = input<Book | null>(null);
  readonly saving = input(false);
  /** Field errors reported by the API (`details`), shown inline on the matching controls. */
  readonly serverErrors = input<FieldErrors | null>(null);

  readonly save = output<BookDraft>();
  readonly cancelled = output<void>();

  protected readonly limits = BOOK_LIMITS;
  /** Server errors that do not belong to any field (e.g. `non_field_errors`). */
  protected readonly formErrors = signal<readonly string[]>([]);

  private appliedRevision: string | null = null;

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noBlank, Validators.maxLength(BOOK_LIMITS.title)],
    }),
    author: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noBlank, Validators.maxLength(BOOK_LIMITS.author)],
    }),
    isbn: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(BOOK_LIMITS.isbn), isbnValidator()],
    }),
    costUsd: new FormControl<number | null>(null, {
      validators: [
        Validators.required,
        positiveNumber(),
        maxDecimals(BOOK_LIMITS.costDecimals),
        maxIntegerDigits(BOOK_LIMITS.costMaxDigits, BOOK_LIMITS.costDecimals),
      ],
    }),
    stockQuantity: new FormControl<number | null>(0, {
      validators: [Validators.required, Validators.min(0), integerNumber()],
    }),
    category: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noBlank, Validators.maxLength(BOOK_LIMITS.category)],
    }),
    supplierCountry: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
    }),
  });

  constructor() {
    effect(() => {
      const book = this.book();
      untracked(() => {
        if (!book) return;
        // A background refresh of the same revision must not wipe what the user is typing.
        const revision = `${book.id}:${book.updatedAt}`;
        if (revision === this.appliedRevision) return;
        this.appliedRevision = revision;
        this.form.reset({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          costUsd: book.costUsd,
          stockQuantity: book.stockQuantity,
          category: book.category,
          supplierCountry: book.supplierCountry,
        });
      });
    });

    effect(() => {
      const errors = this.serverErrors();
      untracked(() => this.applyServerErrors(errors));
    });
  }

  protected submit(): void {
    this.formErrors.set([]);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const value = this.form.getRawValue();
    const { costUsd, stockQuantity } = value;
    if (costUsd === null || stockQuantity === null) return;

    this.save.emit({
      title: value.title.trim(),
      author: value.author.trim(),
      isbn: value.isbn.trim(),
      costUsd,
      stockQuantity,
      category: value.category.trim(),
      supplierCountry: value.supplierCountry.trim().toUpperCase(),
    });
  }

  /** Human-readable message for the first error on a control; empty when valid. */
  protected errorMessage(control: AbstractControl): string {
    const errors = control.errors;
    if (!errors) return '';
    if (typeof errors['server'] === 'string') return errors['server'];
    if (errors['required'] || errors['blank']) return 'Este campo es obligatorio.';
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
    if (errors['isbnFormat']) return 'El ISBN debe tener 10 o 13 dígitos (se permiten guiones y espacios).';
    if (errors['isbnChecksum']) return 'El dígito de control del ISBN no es válido.';
    if (errors['positive']) return 'El costo debe ser mayor que 0.';
    if (errors['maxDecimals']) return `Máximo ${errors['maxDecimals'].max} decimales.`;
    if (errors['maxDigits']) return `Máximo ${errors['maxDigits'].max} dígitos enteros.`;
    if (errors['min']) return `El valor mínimo es ${errors['min'].min}.`;
    if (errors['integer']) return 'Debe ser un número entero.';
    if (errors['pattern']) return 'Usa un código de 2 letras (por ejemplo, US).';
    return 'Valor no válido.';
  }

  private applyServerErrors(errors: FieldErrors | null): void {
    const unmatched: string[] = [];
    if (errors) {
      for (const [field, messages] of Object.entries(errors)) {
        const controlName = CONTROL_BY_API_FIELD[field];
        const control = controlName ? this.form.get(controlName) : null;
        if (control) {
          control.setErrors({ server: messages.join(' ') });
          control.markAsTouched();
        } else {
          unmatched.push(...messages);
        }
      }
    }
    this.formErrors.set(unmatched);
    this.changeDetector.markForCheck();
  }

  private focusFirstInvalid(): void {
    this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
  }
}

/** Rejects values made only of whitespace (which `required` accepts). */
function noBlank(control: AbstractControl): { blank: true } | null {
  const value: unknown = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim() === '' ? { blank: true } : null;
}
