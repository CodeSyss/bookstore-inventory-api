/** Which slice of the catalog is being browsed. */
export type BookFilter =
  | { readonly kind: 'all' }
  | { readonly kind: 'category'; readonly category: string }
  | { readonly kind: 'low-stock'; readonly threshold: number };

export const NO_FILTER: BookFilter = { kind: 'all' };

export function isFiltered(filter: BookFilter): boolean {
  return filter.kind !== 'all';
}

export function filtersEqual(a: BookFilter, b: BookFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'category' && b.kind === 'category') return a.category === b.category;
  if (a.kind === 'low-stock' && b.kind === 'low-stock') return a.threshold === b.threshold;
  return true;
}
