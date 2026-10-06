import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { APP_CONFIG } from '../../core/config/app-config';
import { ApiError } from '../../core/http/api-error';
import { Book, BookDraft } from '../domain/book.model';
import { BooksRepository } from '../domain/books.repository';
import { Page } from '../domain/page.model';
import { PriceCalculation } from '../domain/price-calculation.model';
import { makeBook, makeCalculation, makePage } from '../testing/book.fixture';
import { BooksStore } from './books-store';

class FakeBooksRepository extends BooksRepository {
  readonly list = vi.fn<BooksRepository['list']>();
  readonly get = vi.fn<BooksRepository['get']>();
  readonly create = vi.fn<BooksRepository['create']>();
  readonly update = vi.fn<BooksRepository['update']>();
  readonly remove = vi.fn<BooksRepository['remove']>();
  readonly calculatePrice = vi.fn<BooksRepository['calculatePrice']>();
}

const draft: BookDraft = {
  title: 'Rayuela',
  author: 'Julio Cortázar',
  isbn: '0-306-40615-2',
  costUsd: 20,
  stockQuantity: 3,
  category: 'Novela',
  supplierCountry: 'AR',
};

function notFound(): ApiError {
  return new ApiError(404, 'not_found', 'No encontrado.');
}

describe('BooksStore', () => {
  let repository: FakeBooksRepository;
  let store: BooksStore;

  beforeEach(() => {
    repository = new FakeBooksRepository();
    repository.list.mockReturnValue(of(makePage([])));

    TestBed.configureTestingModule({
      providers: [
        BooksStore,
        { provide: BooksRepository, useValue: repository },
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://api.test', localCurrency: 'EUR' } },
      ],
    });
    store = TestBed.inject(BooksStore);
  });

  describe('loading the catalog', () => {
    it('requests the first page without a filter and exposes the result', async () => {
      const books = [makeBook({ id: 1 }), makeBook({ id: 2 })];
      repository.list.mockReturnValue(of(makePage(books, { total: 23, hasNext: true })));

      await store.load();

      expect(repository.list).toHaveBeenCalledWith({ filter: { kind: 'all' }, page: 1 });
      expect(store.items()).toEqual(books);
      expect(store.total()).toBe(23);
      expect(store.pageIndex()).toBe(0);
      expect(store.loading()).toBe(false);
      expect(store.hasLoaded()).toBe(true);
    });

    it('is loading while the request is in flight', async () => {
      const response = new Subject<Page<Book>>();
      repository.list.mockReturnValue(response);

      const pending = store.load();
      expect(store.loading()).toBe(true);
      expect(store.hasLoaded()).toBe(false);

      response.next(makePage([makeBook()]));
      response.complete();
      await pending;

      expect(store.loading()).toBe(false);
    });

    it('reports an empty catalog only after a load completed with no books', async () => {
      expect(store.isEmpty()).toBe(false);

      await store.load();

      expect(store.isEmpty()).toBe(true);
    });

    it('keeps the error and stops loading when the request fails', async () => {
      repository.list.mockReturnValue(throwError(() => new ApiError(0, 'network_error', 'Sin conexión')));

      await store.load();

      expect(store.loadError()?.status).toBe(0);
      expect(store.loading()).toBe(false);
      expect(store.isEmpty()).toBe(false);
    });

    it('ignores a stale response that arrives after a newer request', async () => {
      const first = new Subject<Page<Book>>();
      const second = new Subject<Page<Book>>();
      repository.list.mockReturnValueOnce(first).mockReturnValueOnce(second);

      const slow = store.load();
      const fast = store.changePage(2);

      second.next(makePage([makeBook({ id: 20 })]));
      second.complete();
      await fast;
      first.next(makePage([makeBook({ id: 10 })]));
      first.complete();
      await slow;

      expect(store.items().map((book) => book.id)).toEqual([20]);
      expect(store.loading()).toBe(false);
    });
  });

  describe('pagination', () => {
    it('requests the chosen 1-based page', async () => {
      await store.changePage(3);

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'all' }, page: 3 });
      expect(store.page()).toBe(3);
      expect(store.pageIndex()).toBe(2);
    });

    it('falls back to the first page when the requested page no longer exists', async () => {
      repository.list
        .mockReturnValueOnce(throwError(() => notFound()))
        .mockReturnValueOnce(of(makePage([makeBook()])));

      await store.changePage(4);

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'all' }, page: 1 });
      expect(store.page()).toBe(1);
      expect(store.items()).toHaveLength(1);
      expect(store.loadError()).toBeNull();
    });
  });

  describe('filtering', () => {
    it('applies a category filter and restarts from the first page', async () => {
      await store.changePage(3);

      await store.setFilter({ kind: 'category', category: 'Novela' });

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'category', category: 'Novela' }, page: 1 });
      expect(store.page()).toBe(1);
      expect(store.isFiltered()).toBe(true);
    });

    it('switches between a category filter and the low-stock view', async () => {
      await store.setFilter({ kind: 'category', category: 'Novela' });
      await store.setFilter({ kind: 'low-stock', threshold: 5 });

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'low-stock', threshold: 5 }, page: 1 });
      expect(store.filter()).toEqual({ kind: 'low-stock', threshold: 5 });
    });

    it('keeps the active filter while paginating', async () => {
      await store.setFilter({ kind: 'low-stock', threshold: 10 });

      await store.changePage(2);

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'low-stock', threshold: 10 }, page: 2 });
    });

    it('clears the filter and returns to the full catalog', async () => {
      await store.setFilter({ kind: 'category', category: 'Novela' });

      await store.clearFilter();

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'all' }, page: 1 });
      expect(store.isFiltered()).toBe(false);
    });
  });

  describe('price calculation', () => {
    beforeEach(async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1 }), makeBook({ id: 2, isbn: '0306406152' })])));
      await store.load();
    });

    it('marks only the calculated book as busy while the request is in flight', async () => {
      const response = new Subject<PriceCalculation>();
      repository.calculatePrice.mockReturnValue(response);

      const pending = store.calculatePrice(1);
      expect(store.calculatingIds().has(1)).toBe(true);
      expect(store.calculatingIds().has(2)).toBe(false);

      response.next(makeCalculation());
      response.complete();
      await pending;

      expect(store.calculatingIds().size).toBe(0);
    });

    it('updates the selling price of the row without reloading the list', async () => {
      repository.calculatePrice.mockReturnValue(of(makeCalculation({ bookId: 1, sellingPriceLocal: 16.1 })));

      const calculation = await store.calculatePrice(1);

      expect(calculation.sellingPriceLocal).toBe(16.1);
      expect(store.items().find((book) => book.id === 1)?.sellingPriceLocal).toBe(16.1);
      expect(store.items().find((book) => book.id === 2)?.sellingPriceLocal).toBeNull();
      expect(repository.list).toHaveBeenCalledTimes(1);
    });

    it('updates the detail copy of the book and keeps the breakdown for later', async () => {
      repository.get.mockReturnValue(of(makeBook({ id: 1 })));
      await store.loadBook(1);
      const calculation = makeCalculation({ bookId: 1, sellingPriceLocal: 99.99, currency: 'COP' });
      repository.calculatePrice.mockReturnValue(of(calculation));

      await store.calculatePrice(1);

      expect(store.current()?.sellingPriceLocal).toBe(99.99);
      expect(store.calculations().get(1)).toEqual(calculation);
      expect(store.localCurrency()).toBe('COP');
    });

    it('uses the calculation time as the new updatedAt in the list and the detail', async () => {
      repository.get.mockReturnValue(of(makeBook({ id: 1 })));
      await store.loadBook(1);
      const calculatedAt = '2026-10-06T14:13:35.792059Z';
      repository.calculatePrice.mockReturnValue(of(makeCalculation({ bookId: 1, calculatedAt })));

      await store.calculatePrice(1);

      expect(store.current()?.updatedAt).toBe(calculatedAt);
      expect(store.items().find((book) => book.id === 1)?.updatedAt).toBe(calculatedAt);
      expect(store.items().find((book) => book.id === 2)?.updatedAt).not.toBe(calculatedAt);
    });

    it('leaves the book untouched and clears the busy flag when the calculation fails', async () => {
      repository.calculatePrice.mockReturnValue(throwError(() => new ApiError(503, 'service_unavailable', 'Caído')));

      await expect(store.calculatePrice(1)).rejects.toMatchObject({ status: 503 });

      expect(store.calculatingIds().size).toBe(0);
      expect(store.items().find((book) => book.id === 1)?.sellingPriceLocal).toBeNull();
      expect(store.calculations().size).toBe(0);
    });
  });

  describe('deleting', () => {
    it('removes the book and reloads the current page', async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1 }), makeBook({ id: 2 })])));
      await store.load();
      repository.remove.mockReturnValue(of(undefined));
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 2 })])));

      await store.remove(1);

      expect(repository.remove).toHaveBeenCalledWith(1);
      expect(store.items().map((book) => book.id)).toEqual([2]);
      expect(store.deletingIds().size).toBe(0);
    });

    it('steps back one page when the last book of a later page is deleted', async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 11 })], { total: 11 })));
      await store.changePage(2);
      repository.remove.mockReturnValue(of(undefined));
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1 })], { total: 10 })));

      await store.remove(11);

      expect(repository.list).toHaveBeenLastCalledWith({ filter: { kind: 'all' }, page: 1 });
      expect(store.page()).toBe(1);
    });

    it('keeps the book and clears the busy flag when the delete fails', async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1 })])));
      await store.load();
      repository.remove.mockReturnValue(throwError(() => notFound()));

      await expect(store.remove(1)).rejects.toBeInstanceOf(ApiError);

      expect(store.deletingIds().size).toBe(0);
      expect(store.items()).toHaveLength(1);
    });
  });

  describe('creating and updating', () => {
    it('exposes the created book as current', async () => {
      const created = makeBook({ id: 7, title: draft.title });
      repository.create.mockReturnValue(of(created));

      const result = await store.create(draft);

      expect(repository.create).toHaveBeenCalledWith(draft);
      expect(result).toBe(created);
      expect(store.current()).toBe(created);
    });

    it('replaces the updated row and drops the now outdated price breakdown', async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1, costUsd: 12.5, sellingPriceLocal: 16.1 })])));
      await store.load();
      repository.calculatePrice.mockReturnValue(of(makeCalculation({ bookId: 1 })));
      await store.calculatePrice(1);
      const updated = makeBook({ id: 1, costUsd: 30, sellingPriceLocal: null });
      repository.update.mockReturnValue(of(updated));

      await store.update(1, { ...draft, costUsd: 30 });

      expect(repository.update).toHaveBeenCalledWith(1, { ...draft, costUsd: 30 });
      expect(store.items()[0]).toEqual(updated);
      expect(store.calculations().has(1)).toBe(false);
    });

    it('does not touch the list when the server rejects the update', async () => {
      repository.list.mockReturnValue(of(makePage([makeBook({ id: 1 })])));
      await store.load();
      const rejection = new ApiError(400, 'validation_error', 'Datos inválidos.', { isbn: ['Ya existe un libro con este ISBN.'] });
      repository.update.mockReturnValue(throwError(() => rejection));

      await expect(store.update(1, draft)).rejects.toBe(rejection);

      expect(store.items()[0]?.title).toBe('Cien años de soledad');
    });
  });

  describe('loading one book', () => {
    it('exposes the book', async () => {
      repository.get.mockReturnValue(of(makeBook({ id: 5 })));

      await store.loadBook(5);

      expect(store.current()?.id).toBe(5);
      expect(store.currentNotFound()).toBe(false);
      expect(store.currentLoading()).toBe(false);
    });

    it('flags a missing book instead of throwing', async () => {
      repository.get.mockReturnValue(throwError(() => notFound()));

      await store.loadBook(99);

      expect(store.current()).toBeNull();
      expect(store.currentNotFound()).toBe(true);
    });

    it('does not report a missing book for non-404 failures', async () => {
      repository.get.mockReturnValue(throwError(() => new ApiError(500, 'internal_error', 'Error')));

      await store.loadBook(1);

      expect(store.currentNotFound()).toBe(false);
    });
  });

  it('starts with the configured local currency', () => {
    expect(store.localCurrency()).toBe('EUR');
  });
});
