import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { APP_CONFIG } from '../../core/config/app-config';
import { ApiError } from '../../core/http/api-error';
import { SpanishPaginatorIntl } from '../../core/i18n/spanish-paginator-intl';
import { BooksStore } from '../application/books-store';
import { Book } from '../domain/book.model';
import { BooksRepository } from '../domain/books.repository';
import { PriceCalculation } from '../domain/price-calculation.model';
import { makeBook, makeCalculation, makePage } from '../testing/book.fixture';
import { InventoryPage } from './inventory-page';

class FakeBooksRepository extends BooksRepository {
  readonly list = vi.fn<BooksRepository['list']>();
  readonly get = vi.fn<BooksRepository['get']>();
  readonly create = vi.fn<BooksRepository['create']>();
  readonly update = vi.fn<BooksRepository['update']>();
  readonly remove = vi.fn<BooksRepository['remove']>();
  readonly calculatePrice = vi.fn<BooksRepository['calculatePrice']>();
}

describe('InventoryPage', () => {
  let repository: FakeBooksRepository;
  let fixture: ComponentFixture<InventoryPage>;
  let root: HTMLElement;

  const books: Book[] = [
    makeBook({ id: 1, title: 'Cien años de soledad', stockQuantity: 25 }),
    makeBook({ id: 2, title: 'Rayuela', isbn: '0-306-40615-2', stockQuantity: 2 }),
  ];

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function createPage(): Promise<void> {
    fixture = TestBed.createComponent(InventoryPage);
    root = fixture.nativeElement as HTMLElement;
    await settle();
  }

  function rows(): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('tr[mat-row], tr.mat-mdc-row'));
  }

  function rowFor(title: string): HTMLElement {
    const row = rows().find((candidate) => candidate.textContent?.includes(title));
    if (!row) throw new Error(`No row for ${title}`);
    return row;
  }

  beforeEach(() => {
    repository = new FakeBooksRepository();
    repository.list.mockReturnValue(of(makePage(books, { total: 12, hasNext: true })));

    TestBed.configureTestingModule({
      providers: [
        BooksStore,
        { provide: BooksRepository, useValue: repository },
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://api.test', localCurrency: 'EUR' } },
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: MatPaginatorIntl, useClass: SpanishPaginatorIntl },
        provideRouter([]),
      ],
    });
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((container) => (container.innerHTML = ''));
  });

  it('loads the first page on entry and lists the books with the total from the backend', async () => {
    await createPage();

    expect(repository.list).toHaveBeenCalledWith({ filter: { kind: 'all' }, page: 1 });
    expect(rows()).toHaveLength(2);
    expect(root.textContent).toContain('12 libros en el inventario');
    expect(root.textContent).toContain('1 – 10 de 12');
    expect(rowFor('Cien años de soledad').textContent).toContain('Sin calcular');
  });

  it('marks low-stock books with a warning badge', async () => {
    await createPage();

    expect(rowFor('Rayuela').querySelector('app-stock-badge .low')).not.toBeNull();
    expect(rowFor('Cien años de soledad').querySelector('app-stock-badge .low')).toBeNull();
  });

  describe('calculating a price', () => {
    function calculateButton(title: string): HTMLButtonElement {
      const button = rowFor(title).querySelector<HTMLButtonElement>('button[aria-label="Calcular precio de venta"]');
      if (!button) throw new Error('Missing calculate button');
      return button;
    }

    it('shows the breakdown and updates the row without reloading the list', async () => {
      repository.calculatePrice.mockReturnValue(of(makeCalculation({ bookId: 1, sellingPriceLocal: 16.1 })));
      await createPage();

      calculateButton('Cien años de soledad').click();
      await settle();

      expect(repository.calculatePrice).toHaveBeenCalledWith(1);
      expect(rowFor('Cien años de soledad').textContent).toMatch(/16[.,]10/);
      expect(rowFor('Rayuela').textContent).toContain('Sin calcular');
      expect(repository.list).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain('Precio de venta final');
      expect(document.body.textContent).not.toContain('tasa de cambio por defecto');
    });

    it('explains when the default exchange rate was used', async () => {
      repository.calculatePrice.mockReturnValue(of(makeCalculation({ bookId: 1, rateSource: 'fallback' })));
      await createPage();

      calculateButton('Cien años de soledad').click();
      await settle();

      expect(document.body.textContent).toContain('tasa de cambio por defecto');
    });

    it('spins only the button of the book being calculated', async () => {
      const response = new Subject<PriceCalculation>();
      repository.calculatePrice.mockReturnValue(response);
      await createPage();

      calculateButton('Cien años de soledad').click();
      await settle();

      expect(rowFor('Cien años de soledad').querySelector('mat-progress-spinner')).not.toBeNull();
      expect(calculateButton('Cien años de soledad').disabled).toBe(true);
      expect(rowFor('Rayuela').querySelector('mat-progress-spinner')).toBeNull();
      expect(calculateButton('Rayuela').disabled).toBe(false);

      response.next(makeCalculation({ bookId: 1 }));
      response.complete();
      await settle();

      expect(rowFor('Cien años de soledad').querySelector('mat-progress-spinner')).toBeNull();
    });

    it('leaves the row as it was when the calculation fails', async () => {
      repository.calculatePrice.mockReturnValue(throwError(() => new ApiError(503, 'service_unavailable', 'Caído')));
      await createPage();

      calculateButton('Cien años de soledad').click();
      await settle();

      expect(rowFor('Cien años de soledad').textContent).toContain('Sin calcular');
      expect(document.body.textContent).not.toContain('Precio de venta final');
      expect(rowFor('Cien años de soledad').querySelector('mat-progress-spinner')).toBeNull();
    });
  });

  describe('empty states', () => {
    it('invites to add the first book when the inventory is empty', async () => {
      repository.list.mockReturnValue(of(makePage([])));

      await createPage();

      expect(root.textContent).toContain('Aún no hay libros en el inventario');
      expect(root.querySelector('mat-paginator')).toBeNull();
    });

    it('tells the user nothing matched the filter and offers to clear it', async () => {
      await createPage();
      repository.list.mockReturnValue(of(makePage([])));

      await fixture.componentInstance['store'].setFilter({ kind: 'category', category: 'Inexistente' });
      await settle();

      expect(root.textContent).toContain('Sin resultados');
      expect(root.textContent).toContain('Quitar filtro');
    });

    it('offers a retry when loading fails', async () => {
      repository.list.mockReturnValue(throwError(() => new ApiError(0, 'network_error', 'No se pudo conectar')));

      await createPage();

      expect(root.textContent).toContain('No se pudo cargar el inventario');
      expect(root.textContent).toContain('Reintentar');
    });
  });

  describe('deleting', () => {
    function pressDelete(title: string): void {
      rowFor(title).querySelector<HTMLButtonElement>('button[aria-label="Eliminar libro"]')?.click();
    }

    function dialogButton(label: string): HTMLButtonElement {
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')).find(
        (candidate) => candidate.textContent?.includes(label),
      );
      if (!button) throw new Error(`Missing dialog button ${label}`);
      return button;
    }

    it('asks for confirmation and deletes only after the user confirms', async () => {
      repository.remove.mockReturnValue(of(undefined));
      await createPage();

      pressDelete('Rayuela');
      await settle();
      expect(document.body.textContent).toContain('¿Seguro que deseas eliminar «Rayuela»?');
      expect(repository.remove).not.toHaveBeenCalled();

      repository.list.mockReturnValue(of(makePage([books[0] as Book], { total: 11, hasNext: true })));
      dialogButton('Eliminar').click();
      await settle();

      expect(repository.remove).toHaveBeenCalledWith(2);
      expect(repository.list).toHaveBeenCalledTimes(2);
      expect(rows()).toHaveLength(1);
    });

    it('does nothing when the user cancels', async () => {
      await createPage();

      pressDelete('Rayuela');
      await settle();
      dialogButton('Cancelar').click();
      await settle();

      expect(repository.remove).not.toHaveBeenCalled();
      expect(rows()).toHaveLength(2);
    });
  });
});
