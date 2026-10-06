import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG } from '../../core/config/app-config';
import { BookDraft } from '../domain/book.model';
import { BooksApi } from './books-api';
import { BookDto } from './books-api.dto';

const BASE = 'http://api.test/books';

const bookDto: BookDto = {
  id: 7,
  title: 'Rayuela',
  author: 'Julio Cortázar',
  isbn: '0-306-40615-2',
  cost_usd: 20.5,
  selling_price_local: null,
  stock_quantity: 3,
  category: 'Novela',
  supplier_country: 'AR',
  created_at: '2026-01-10T12:00:00Z',
  updated_at: '2026-01-11T12:00:00Z',
};

const draft: BookDraft = {
  title: 'Rayuela',
  author: 'Julio Cortázar',
  isbn: '0-306-40615-2',
  costUsd: 20.5,
  stockQuantity: 3,
  category: 'Novela',
  supplierCountry: 'AR',
};

describe('BooksApi', () => {
  let api: BooksApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://api.test', localCurrency: 'EUR' } },
      ],
    });
    api = TestBed.inject(BooksApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list', () => {
    it('queries the plain collection with the page and maps the paginated payload', () => {
      let result: unknown;
      api.list({ filter: { kind: 'all' }, page: 2 }).subscribe((page) => (result = page));

      const request = http.expectOne((req) => req.url === BASE);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.keys()).toEqual(['page']);
      request.flush({ count: 14, next: null, previous: 'http://api.test/books?page=1', results: [bookDto] });

      expect(result).toEqual({
        items: [
          {
            id: 7,
            title: 'Rayuela',
            author: 'Julio Cortázar',
            isbn: '0-306-40615-2',
            costUsd: 20.5,
            sellingPriceLocal: null,
            stockQuantity: 3,
            category: 'Novela',
            supplierCountry: 'AR',
            createdAt: '2026-01-10T12:00:00Z',
            updatedAt: '2026-01-11T12:00:00Z',
          },
        ],
        total: 14,
        hasNext: false,
        hasPrevious: true,
      });
    });

    it('uses the search endpoint for a category filter', () => {
      api.list({ filter: { kind: 'category', category: 'Ciencia ficción' }, page: 1 }).subscribe();

      const request = http.expectOne((req) => req.url === `${BASE}/search`);
      expect(request.request.params.get('category')).toBe('Ciencia ficción');
      expect(request.request.params.get('page')).toBe('1');
      request.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('uses the low-stock endpoint with the threshold', () => {
      api.list({ filter: { kind: 'low-stock', threshold: 0 }, page: 3 }).subscribe();

      const request = http.expectOne((req) => req.url === `${BASE}/low-stock`);
      expect(request.request.params.get('threshold')).toBe('0');
      expect(request.request.params.get('page')).toBe('3');
      request.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('tolerates decimals serialized as strings', () => {
      let costUsd: number | undefined;
      let price: number | null | undefined;
      api.list({ filter: { kind: 'all' }, page: 1 }).subscribe((page) => {
        costUsd = page.items[0]?.costUsd;
        price = page.items[0]?.sellingPriceLocal;
      });

      http
        .expectOne((req) => req.url === BASE)
        .flush({
          count: 1,
          next: null,
          previous: null,
          results: [{ ...bookDto, cost_usd: '20.50', selling_price_local: '31.99' }],
        });

      expect(costUsd).toBe(20.5);
      expect(price).toBe(31.99);
    });
  });

  it('gets one book by id', () => {
    let title: string | undefined;
    api.get(7).subscribe((book) => (title = book.title));

    const request = http.expectOne(`${BASE}/7`);
    expect(request.request.method).toBe('GET');
    request.flush(bookDto);

    expect(title).toBe('Rayuela');
  });

  it('creates a book by POSTing the snake_case body', () => {
    let id: number | undefined;
    api.create(draft).subscribe((book) => (id = book.id));

    const request = http.expectOne(BASE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Rayuela',
      author: 'Julio Cortázar',
      isbn: '0-306-40615-2',
      cost_usd: 20.5,
      stock_quantity: 3,
      category: 'Novela',
      supplier_country: 'AR',
    });
    request.flush(bookDto, { status: 201, statusText: 'Created' });

    expect(id).toBe(7);
  });

  it('updates a book with a full PUT', () => {
    api.update(7, draft).subscribe();

    const request = http.expectOne(`${BASE}/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ title: 'Rayuela', cost_usd: 20.5, supplier_country: 'AR' });
    request.flush(bookDto);
  });

  it('deletes a book', () => {
    let completed = false;
    api.remove(7).subscribe({ complete: () => (completed = true) });

    const request = http.expectOne(`${BASE}/7`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });

  it('POSTs to calculate-price without a body and maps the breakdown', () => {
    let result: unknown;
    api.calculatePrice(7).subscribe((calculation) => (result = calculation));

    const request = http.expectOne(`${BASE}/7/calculate-price`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({
      book_id: 7,
      cost_usd: 20.5,
      exchange_rate: 0.92,
      cost_local: 18.86,
      margin_percentage: 40,
      selling_price_local: 26.4,
      currency: 'EUR',
      rate_source: 'fallback',
      calculation_timestamp: '2026-01-10T12:30:00Z',
    });

    expect(result).toEqual({
      bookId: 7,
      costUsd: 20.5,
      exchangeRate: 0.92,
      costLocal: 18.86,
      marginPercentage: 40,
      sellingPriceLocal: 26.4,
      currency: 'EUR',
      rateSource: 'fallback',
      calculatedAt: '2026-01-10T12:30:00Z',
    });
  });
});
