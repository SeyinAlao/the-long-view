// The one shape a day's price takes inside the app, whatever the source
// (ADR 012). Only the source adapter (ngx-equities-source.ts) knows
// where prices come from; everything after it works with this.
export interface MarketPrice {
  ticker: string;
  closePrice: number;
  // 0 when the source has none (an unchanged price).
  changePercent: number;
  // The trading day the price is for, YYYY-MM-DD.
  tradeDate: string;
}
