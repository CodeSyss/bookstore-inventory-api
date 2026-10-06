import { Routes } from '@angular/router';

import { BooksStore } from './application/books-store';
import { BooksRepository } from './domain/books.repository';
import { BooksApi } from './infrastructure/books-api';

const TITLE_SUFFIX = ' · Inventario de Librería';

/**
 * Feature composition root: binds the repository port to its HTTP adapter and scopes the
 * store to this route tree, so all book pages share one state instance.
 */
export const BOOKS_ROUTES: Routes = [
  {
    path: '',
    providers: [BooksStore, { provide: BooksRepository, useExisting: BooksApi }],
    children: [
      {
        path: '',
        title: `Inventario${TITLE_SUFFIX}`,
        loadComponent: () => import('./pages/inventory-page').then((module) => module.InventoryPage),
      },
      {
        path: 'new',
        title: `Nuevo libro${TITLE_SUFFIX}`,
        loadComponent: () => import('./pages/book-form-page').then((module) => module.BookFormPage),
      },
      {
        path: ':id/edit',
        title: `Editar libro${TITLE_SUFFIX}`,
        loadComponent: () => import('./pages/book-form-page').then((module) => module.BookFormPage),
      },
      {
        path: ':id',
        title: `Detalle del libro${TITLE_SUFFIX}`,
        loadComponent: () => import('./pages/book-detail-page').then((module) => module.BookDetailPage),
      },
    ],
  },
];
