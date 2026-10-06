import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { APP_CONFIG } from '../../core/config/app-config';
import { ApiError } from '../../core/http/api-error';
import { Book, BookDraft } from '../domain/book.model';
import { BookFilter, NO_FILTER, isFiltered } from '../domain/book-filter.model';
import { BooksRepository } from '../domain/books.repository';
import { PAGE_SIZE } from '../domain/page.model';
import { PriceCalculation } from '../domain/price-calculation.model';

/**
 * Signal-based application state for the book inventory.
 *
 * Provided at the books route level (not root) so it lives exactly as long as the feature.
 * Failures of mutating methods are rethrown as {@link ApiError}; the HTTP interceptor has
 * already toasted them, so callers only need to react (for example map field errors).
 */
@Injectable()
export class BooksStore {
  private readonly repository = inject(BooksRepository);

  // --- list state -------------------------------------------------------------------------
  private readonly itemsState = signal<readonly Book[]>([]);
  private readonly totalState = signal(0);
  private readonly pageState = signal(1);
  private readonly filterState = signal<BookFilter>(NO_FILTER);
  private readonly loadingState = signal(false);
  private readonly loadedOnceState = signal(false);
  private readonly loadErrorState = signal<ApiError | null>(null);

  // --- detail state -----------------------------------------------------------------------
  private readonly currentState = signal<Book | null>(null);
  private readonly currentLoadingState = signal(false);
  private readonly currentNotFoundState = signal(false);

  // --- per-action state -------------------------------------------------------------------
  private readonly calculatingIdsState = signal<ReadonlySet<number>>(new Set());
  private readonly deletingIdsState = signal<ReadonlySet<number>>(new Set());
  private readonly calculationsState = signal<ReadonlyMap<number, PriceCalculation>>(new Map());
  private readonly localCurrencyState = signal(inject(APP_CONFIG).localCurrency);

  private listRequestSeq = 0;
  private currentRequestSeq = 0;

  readonly items = this.itemsState.asReadonly();
  readonly total = this.totalState.asReadonly();
  /** 1-based current page. */
  readonly page = this.pageState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  /** True once the first list request has succeeded. */
  readonly hasLoaded = this.loadedOnceState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();

  readonly current = this.currentState.asReadonly();
  readonly currentLoading = this.currentLoadingState.asReadonly();
  readonly currentNotFound = this.currentNotFoundState.asReadonly();

  readonly calculatingIds = this.calculatingIdsState.asReadonly();
  readonly deletingIds = this.deletingIdsState.asReadonly();
  /** Latest price calculation per book id, kept for the current session. */
  readonly calculations = this.calculationsState.asReadonly();
  readonly localCurrency = this.localCurrencyState.asReadonly();

  readonly pageSize = PAGE_SIZE;
  readonly pageIndex = computed(() => this.pageState() - 1);
  readonly isFiltered = computed(() => isFiltered(this.filterState()));
  /** True once a load completed with no books, so empty states are not shown while loading. */
  readonly isEmpty = computed(
    () => this.loadedOnceState() && !this.loadingState() && this.loadErrorState() === null && this.itemsState().length === 0,
  );

  // --- queries ----------------------------------------------------------------------------

  /** Loads the current page with the active filter. Never rejects; check {@link loadError}. */
  async load(): Promise<void> {
    const requestSeq = ++this.listRequestSeq;
    this.loadingState.set(true);
    this.loadErrorState.set(null);

    try {
      const page = await firstValueFrom(this.repository.list({ filter: this.filterState(), page: this.pageState() }));
      if (requestSeq !== this.listRequestSeq) return;
      this.itemsState.set(page.items);
      this.totalState.set(page.total);
      this.loadedOnceState.set(true);
    } catch (error) {
      if (requestSeq !== this.listRequestSeq) return;
      const apiError = ApiError.from(error);
      // The requested page vanished (e.g. books were deleted elsewhere): fall back to the first one.
      if (apiError.status === 404 && this.pageState() > 1) {
        this.pageState.set(1);
        return this.load();
      }
      this.loadErrorState.set(apiError);
    } finally {
      if (requestSeq === this.listRequestSeq) this.loadingState.set(false);
    }
  }

  /** Applies a new filter, always restarting from the first page. */
  setFilter(filter: BookFilter): Promise<void> {
    this.filterState.set(filter);
    this.pageState.set(1);
    return this.load();
  }

  clearFilter(): Promise<void> {
    return this.setFilter(NO_FILTER);
  }

  /** @param page 1-based page number. */
  changePage(page: number): Promise<void> {
    this.pageState.set(Math.max(1, page));
    return this.load();
  }

  /** Loads one book into {@link current}; a 404 sets {@link currentNotFound} instead of throwing. */
  async loadBook(id: number): Promise<void> {
    const requestSeq = ++this.currentRequestSeq;
    if (this.currentState()?.id !== id) this.currentState.set(null);
    this.currentNotFoundState.set(false);
    this.currentLoadingState.set(true);

    try {
      const book = await firstValueFrom(this.repository.get(id));
      if (requestSeq !== this.currentRequestSeq) return;
      this.currentState.set(book);
    } catch (error) {
      if (requestSeq !== this.currentRequestSeq) return;
      this.currentState.set(null);
      this.currentNotFoundState.set(ApiError.from(error).status === 404);
    } finally {
      if (requestSeq === this.currentRequestSeq) this.currentLoadingState.set(false);
    }
  }

  // --- commands ---------------------------------------------------------------------------

  async create(draft: BookDraft): Promise<Book> {
    const book = await firstValueFrom(this.repository.create(draft));
    this.currentState.set(book);
    return book;
  }

  async update(id: number, draft: BookDraft): Promise<Book> {
    const book = await firstValueFrom(this.repository.update(id, draft));
    this.replaceBook(book);
    // A new cost invalidates any breakdown calculated for the previous one.
    this.dropCalculation(id);
    return book;
  }

  async remove(id: number): Promise<void> {
    this.deletingIdsState.update((ids) => new Set(ids).add(id));
    try {
      await firstValueFrom(this.repository.remove(id));
    } finally {
      this.deletingIdsState.update((ids) => withoutId(ids, id));
    }

    this.dropCalculation(id);
    if (this.currentState()?.id === id) this.currentState.set(null);
    // Removing the last item of a page would leave it empty, so step back one page.
    if (this.itemsState().length === 1 && this.pageState() > 1) {
      this.pageState.update((page) => page - 1);
    }
    await this.load();
  }

  /**
   * Calls the pricing endpoint and patches the book's selling price and `updatedAt` everywhere it
   * is shown. The backend persists the calculation at `calculatedAt`, so it is the new `updatedAt`.
   */
  async calculatePrice(id: number): Promise<PriceCalculation> {
    this.calculatingIdsState.update((ids) => new Set(ids).add(id));
    try {
      const calculation = await firstValueFrom(this.repository.calculatePrice(id));
      this.calculationsState.update((map) => new Map(map).set(id, calculation));
      this.localCurrencyState.set(calculation.currency);
      this.patchCalculatedPrice(id, calculation);
      return calculation;
    } finally {
      this.calculatingIdsState.update((ids) => withoutId(ids, id));
    }
  }

  // --- internals --------------------------------------------------------------------------

  private replaceBook(book: Book): void {
    this.itemsState.update((items) => items.map((item) => (item.id === book.id ? book : item)));
    this.currentState.set(book);
  }

  private patchCalculatedPrice(id: number, { sellingPriceLocal, calculatedAt }: PriceCalculation): void {
    const patch = (book: Book): Book =>
      book.id === id ? { ...book, sellingPriceLocal, updatedAt: calculatedAt } : book;
    this.itemsState.update((items) => items.map(patch));
    this.currentState.update((book) => (book ? patch(book) : book));
  }

  private dropCalculation(id: number): void {
    this.calculationsState.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }
}

function withoutId(ids: ReadonlySet<number>, id: number): ReadonlySet<number> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}
