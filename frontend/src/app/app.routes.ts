import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  {
    path: 'books',
    loadChildren: () => import('./books/books.routes').then((module) => module.BOOKS_ROUTES),
  },
  {
    path: '**',
    title: 'Página no encontrada · Inventario de Librería',
    loadComponent: () => import('./core/layout/not-found-page').then((module) => module.NotFoundPage),
  },
];
