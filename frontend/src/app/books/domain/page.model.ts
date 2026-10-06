/** One page of a backend-paginated collection. */
export interface Page<T> {
  readonly items: readonly T[];
  /** Total number of items across all pages. */
  readonly total: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
}

/** Page size enforced by the backend; it is not configurable by clients. */
export const PAGE_SIZE = 10;
