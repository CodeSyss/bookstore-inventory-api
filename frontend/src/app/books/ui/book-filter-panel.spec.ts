import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookFilter } from '../domain/book-filter.model';
import { BookFilterPanel } from './book-filter-panel';

describe('BookFilterPanel', () => {
  let fixture: ComponentFixture<BookFilterPanel>;
  let root: HTMLElement;
  let emitted: BookFilter[];

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function chooseMode(label: string): void {
    const toggle = Array.from(root.querySelectorAll<HTMLButtonElement>('mat-button-toggle button')).find((button) =>
      button.textContent?.includes(label),
    );
    if (!toggle) throw new Error(`Missing mode ${label}`);
    toggle.click();
  }

  function field(name: 'category' | 'threshold'): HTMLInputElement {
    const element = root.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`);
    if (!element) throw new Error(`Missing field ${name}`);
    return element;
  }

  function type(name: 'category' | 'threshold', value: string): void {
    const element = field(name);
    element.value = value;
    element.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    root.querySelector('form')?.dispatchEvent(new Event('submit'));
    await settle();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BookFilterPanel] }).compileComponents();
    fixture = TestBed.createComponent(BookFilterPanel);
    root = fixture.nativeElement as HTMLElement;
    emitted = [];
    fixture.componentInstance.filterChange.subscribe((filter) => emitted.push(filter));
    await settle();
  });

  it('applies the low-stock quick view with the default threshold of 10 right away', async () => {
    chooseMode('Stock bajo');
    await settle();

    expect(emitted).toEqual([{ kind: 'low-stock', threshold: 10 }]);
    expect(field('threshold').value).toBe('10');
  });

  it('applies a custom low-stock threshold, including 0', async () => {
    chooseMode('Stock bajo');
    await settle();
    emitted.length = 0;

    type('threshold', '0');
    await submit();

    expect(emitted).toEqual([{ kind: 'low-stock', threshold: 0 }]);
  });

  it.each(['-1', '2.5', ''])('rejects the invalid threshold "%s"', async (value) => {
    chooseMode('Stock bajo');
    await settle();
    emitted.length = 0;

    type('threshold', value);
    await submit();

    expect(emitted).toHaveLength(0);
    expect(root.querySelector('mat-error')).not.toBeNull();
  });

  it('searches by category with the trimmed text', async () => {
    chooseMode('Por categoría');
    await settle();
    expect(emitted).toHaveLength(0);

    type('category', '  Novela ');
    await submit();

    expect(emitted).toEqual([{ kind: 'category', category: 'Novela' }]);
  });

  it('does not search with an empty category and explains why', async () => {
    chooseMode('Por categoría');
    await settle();

    await submit();

    expect(emitted).toHaveLength(0);
    expect(root.querySelector('mat-error')?.textContent).toContain('Ingresa una categoría');
  });

  it('returns to the whole catalog when "Todos" is chosen', async () => {
    chooseMode('Por categoría');
    await settle();

    chooseMode('Todos');
    await settle();

    expect(emitted).toEqual([{ kind: 'all' }]);
  });

  it('mirrors the applied filter and offers to clear it', async () => {
    fixture.componentRef.setInput('filter', { kind: 'category', category: 'Novela' } satisfies BookFilter);
    await settle();

    expect(field('category').value).toBe('Novela');

    const clear = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Quitar filtro'),
    );
    clear?.click();
    await settle();

    expect(emitted).toEqual([{ kind: 'all' }]);
  });
});
