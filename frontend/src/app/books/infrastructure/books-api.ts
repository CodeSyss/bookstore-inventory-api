import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { APP_CONFIG } from '../../core/config/app-config';
import { Book, BookDraft } from '../domain/book.model';
import { BookListQuery, BooksRepository } from '../domain/books.repository';
import { Page } from '../domain/page.model';
import { PriceCalculation } from '../domain/price-calculation.model';
import {
  BookDto,
  PageDto,
  PriceCalculationDto,
  toBook,
  toBookPage,
  toBookWriteDto,
  toPriceCalculation,
} from './books-api.dto';

/** HTTP adapter for {@link BooksRepository}; the only place that knows the API URLs. */
@Injectable({ providedIn: 'root' })
export class BooksApi implements BooksRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(APP_CONFIG).apiBaseUrl}/books`;

  list({ filter, page }: BookListQuery): Observable<Page<Book>> {
    let url = this.baseUrl;
    let params = new HttpParams();

    switch (filter.kind) {
      case 'category':
        url = `${this.baseUrl}/search`;
        params = params.set('category', filter.category);
        break;
      case 'low-stock':
        url = `${this.baseUrl}/low-stock`;
        params = params.set('threshold', filter.threshold);
        break;
      case 'all':
        break;
    }

    return this.http
      .get<PageDto<BookDto>>(url, { params: params.set('page', page) })
      .pipe(map(toBookPage));
  }

  get(id: number): Observable<Book> {
    return this.http.get<BookDto>(`${this.baseUrl}/${id}`).pipe(map(toBook));
  }

  create(draft: BookDraft): Observable<Book> {
    return this.http.post<BookDto>(this.baseUrl, toBookWriteDto(draft)).pipe(map(toBook));
  }

  update(id: number, draft: BookDraft): Observable<Book> {
    return this.http.put<BookDto>(`${this.baseUrl}/${id}`, toBookWriteDto(draft)).pipe(map(toBook));
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  calculatePrice(id: number): Observable<PriceCalculation> {
    return this.http
      .post<PriceCalculationDto>(`${this.baseUrl}/${id}/calculate-price`, null)
      .pipe(map(toPriceCalculation));
  }
}
