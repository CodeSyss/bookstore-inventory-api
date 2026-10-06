/**
 * Production environment. Point `apiBaseUrl` at the deployed API origin.
 * `environment.development.ts` replaces this file in development builds.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8000',
  /** ISO 4217 code used until a price calculation reports the real one (backend `LOCAL_CURRENCY`). */
  localCurrency: 'EUR',
} as const;
