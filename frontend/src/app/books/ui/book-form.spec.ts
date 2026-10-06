import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookDraft } from '../domain/book.model';
import { makeBook } from '../testing/book.fixture';
import { BookForm } from './book-form';

type FieldName = 'title' | 'author' | 'isbn' | 'costUsd' | 'stockQuantity' | 'category' | 'supplierCountry';

describe('BookForm', () => {
  let fixture: ComponentFixture<BookForm>;
  let saved: BookDraft[];
  let root: HTMLElement;

  const validValues: Record<FieldName, string> = {
    title: 'Rayuela',
    author: 'Julio Cortázar',
    isbn: '978-84-376-0494-7',
    costUsd: '20.5',
    stockQuantity: '3',
    category: 'Novela',
    supplierCountry: 'ar',
  };

  function input(name: FieldName): HTMLInputElement {
    const element = root.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`);
    if (!element) throw new Error(`Missing input ${name}`);
    return element;
  }

  function type(name: FieldName, value: string): void {
    const element = input(name);
    element.value = value;
    element.dispatchEvent(new Event('input'));
  }

  function fillAll(overrides: Partial<Record<FieldName, string>> = {}): void {
    const values = { ...validValues, ...overrides };
    for (const name of Object.keys(values) as FieldName[]) type(name, values[name]);
  }

  async function submit(): Promise<void> {
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function errorTexts(): string[] {
    return Array.from(root.querySelectorAll('mat-error')).map((element) => element.textContent?.trim() ?? '');
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BookForm] }).compileComponents();
    fixture = TestBed.createComponent(BookForm);
    root = fixture.nativeElement as HTMLElement;
    saved = [];
    fixture.componentInstance.save.subscribe((draft) => saved.push(draft));
    await fixture.whenStable();
  });

  describe('client-side validation', () => {
    it('does not emit and flags every required field when submitted empty', async () => {
      await submit();

      expect(saved).toHaveLength(0);
      expect(errorTexts().filter((text) => text === 'Este campo es obligatorio.').length).toBeGreaterThanOrEqual(5);
    });

    it('blocks an ISBN with the wrong check digit before anything is sent', async () => {
      fillAll({ isbn: '978-84-376-0494-8' });

      await submit();

      expect(saved).toHaveLength(0);
      expect(errorTexts()).toContain('El dígito de control del ISBN no es válido.');
    });

    it('blocks an ISBN that is not 10 or 13 digits', async () => {
      fillAll({ isbn: '12345' });

      await submit();

      expect(saved).toHaveLength(0);
      expect(errorTexts()).toContain('El ISBN debe tener 10 o 13 dígitos (se permiten guiones y espacios).');
    });

    it.each([
      ['zero', '0', 'El costo debe ser mayor que 0.'],
      ['negative', '-4', 'El costo debe ser mayor que 0.'],
      ['more than two decimals', '10.255', 'Máximo 2 decimales.'],
      ['more than eight integer digits', '123456789', 'Máximo 8 dígitos enteros.'],
    ])('blocks a cost that is %s', async (_label, cost, message) => {
      fillAll({ costUsd: cost });

      await submit();

      expect(saved).toHaveLength(0);
      expect(errorTexts()).toContain(message);
    });

    it('blocks a negative or fractional stock quantity', async () => {
      fillAll({ stockQuantity: '-1' });
      await submit();
      expect(saved).toHaveLength(0);

      fillAll({ stockQuantity: '1.5' });
      await submit();
      expect(saved).toHaveLength(0);
      expect(errorTexts()).toContain('Debe ser un número entero.');
    });

    it('requires a two-letter supplier country', async () => {
      fillAll({ supplierCountry: 'A' });

      await submit();

      expect(saved).toHaveLength(0);
      expect(errorTexts()).toContain('Usa un código de 2 letras (por ejemplo, US).');
    });

    it('rejects whitespace-only text fields', async () => {
      fillAll({ title: '   ' });

      await submit();

      expect(saved).toHaveLength(0);
    });
  });

  describe('submitting a valid form', () => {
    it('emits the normalized draft: trimmed text, numeric values and uppercase country', async () => {
      fillAll({ title: '  Rayuela  ', supplierCountry: 'ar' });

      await submit();

      expect(saved).toEqual([
        {
          title: 'Rayuela',
          author: 'Julio Cortázar',
          isbn: '978-84-376-0494-7',
          costUsd: 20.5,
          stockQuantity: 3,
          category: 'Novela',
          supplierCountry: 'AR',
        },
      ]);
    });

    it('accepts a valid ISBN-10 with a trailing X', async () => {
      fillAll({ isbn: '0-8044-2957-X' });

      await submit();

      expect(saved).toHaveLength(1);
    });
  });

  describe('server-side validation errors', () => {
    beforeEach(async () => {
      fillAll();
      await submit();
      saved.length = 0;
    });

    it('shows API field errors inline on the matching controls', async () => {
      fixture.componentRef.setInput('serverErrors', {
        isbn: ['Ya existe un libro con este ISBN.'],
        cost_usd: ['Asegúrese de que no haya más de 10 dígitos en total.'],
      });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(errorTexts()).toEqual(
        expect.arrayContaining(['Ya existe un libro con este ISBN.', 'Asegúrese de que no haya más de 10 dígitos en total.']),
      );
    });

    it('invalidates the form so it cannot be resubmitted until the field is edited', async () => {
      fixture.componentRef.setInput('serverErrors', { isbn: ['Ya existe un libro con este ISBN.'] });
      await fixture.whenStable();

      await submit();
      expect(saved).toHaveLength(0);

      type('isbn', '0-306-40615-2');
      await submit();
      expect(saved).toHaveLength(1);
    });

    it('shows errors that do not belong to a field in an alert', async () => {
      fixture.componentRef.setInput('serverErrors', { non_field_errors: ['Operación no permitida.'] });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(root.querySelector('[role="alert"]')?.textContent).toContain('Operación no permitida.');
    });
  });

  describe('editing', () => {
    it('pre-fills the form from the book and labels the action accordingly', async () => {
      fixture.componentRef.setInput('book', makeBook({ title: 'Pedro Páramo', costUsd: 9.99, supplierCountry: 'MX' }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(input('title').value).toBe('Pedro Páramo');
      expect(input('costUsd').value).toBe('9.99');
      expect(input('supplierCountry').value).toBe('MX');
      expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Guardar cambios');
    });

    it('keeps what the user typed when the same book revision is pushed again', async () => {
      const book = makeBook();
      fixture.componentRef.setInput('book', book);
      await fixture.whenStable();
      type('title', 'Título editado');

      fixture.componentRef.setInput('book', { ...book });
      await fixture.whenStable();

      expect(input('title').value).toBe('Título editado');
    });
  });

  it('emits cancelled when the user cancels', async () => {
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    root.querySelector<HTMLButtonElement>('button[type="button"]')?.click();

    expect(cancelled).toBe(true);
  });

  it('disables the actions while saving', async () => {
    fixture.componentRef.setInput('saving', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });
});
