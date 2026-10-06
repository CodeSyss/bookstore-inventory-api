/** Where the exchange rate used in a calculation came from. */
export type RateSource = 'live' | 'fallback';

/** Breakdown of how a book's local selling price was derived from its USD cost. */
export interface PriceCalculation {
  readonly bookId: number;
  readonly costUsd: number;
  readonly exchangeRate: number;
  readonly costLocal: number;
  readonly marginPercentage: number;
  readonly sellingPriceLocal: number;
  readonly currency: string;
  readonly rateSource: RateSource;
  readonly calculatedAt: string;
}
