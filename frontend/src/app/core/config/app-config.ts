import { InjectionToken } from '@angular/core';

export interface AppConfig {
  /** Origin of the REST API, without a trailing slash. */
  readonly apiBaseUrl: string;
  /** ISO 4217 code of the local currency, used until a calculation reports the real one. */
  readonly localCurrency: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
