import { ApiError } from './api-error';

export type Attempt<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ApiError };

/**
 * Awaits an operation and turns an {@link ApiError} into a value. API failures were already
 * shown to the user by the HTTP interceptor, so callers only branch on the outcome.
 * Anything that is not an API failure is a bug and is rethrown.
 */
export async function attempt<T>(operation: Promise<T>): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await operation };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    throw error;
  }
}
