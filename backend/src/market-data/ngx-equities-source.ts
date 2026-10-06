import type { MarketPrice } from './market-price';

// NGX's equities price list (ADR 012). Its public page fills the table
// in the browser from this JSON endpoint; we read the JSON directly. It
// is undocumented and may change without notice. Exactly one request per
// run, with a timeout and no retry.
export const NGX_EQUITIES_URL =
  'https://doclib.ngxgroup.com/REST/api/statistics/equities/?market=&sector=&orderby=&pageSize=300&pageNo=0';
const TIMEOUT_MS = 30_000;
// Says who is asking, rather than posing as a browser.
const USER_AGENT = 'TheLongView/1.0 (+https://the-long-view-staging.vercel.app; daily closing prices)';

// What came back, without the body's text: refusals describe a response
// by these numbers only, never its content.
export type FeedResponse = { status: number; contentType: string; bodyLength: number; body: unknown };

export async function fetchNgxEquities(fetchImpl: typeof fetch = fetch): Promise<FeedResponse> {
  const res = await fetchImpl(NGX_EQUITIES_URL, {
    headers: { accept: 'application/json;odata=verbose', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: res.status, contentType: res.headers.get('content-type') ?? '', bodyLength: text.length, body };
}

// `missing` counts, per required field, the rows where it is absent or
// null. Field names are our own labels, so refusals may name them.
export type ParsedFeed = { prices: MarketPrice[]; rows: number; invalid: number; missing: Record<string, number> };

const TICKER = /^[A-Z][A-Z0-9]{1,14}$/;
const TRADE_DATE = /^(\d{4}-\d{2}-\d{2})T/;
const REQUIRED_FIELDS = ['Symbol', 'ClosePrice', 'TradeDate'] as const;

// The fields read from each row (listed in ADR 012): Symbol, ClosePrice,
// PercChange, TradeDate. A row missing a usable symbol, close price or
// trade date is skipped and counted, never guessed at. Anything that
// isn't an array is zero rows.
export function parseNgxEquities(body: unknown): ParsedFeed {
  const missing: Record<string, number> = Object.fromEntries(REQUIRED_FIELDS.map((field) => [field, 0]));
  if (!Array.isArray(body)) return { prices: [], rows: 0, invalid: 0, missing };
  const prices: MarketPrice[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  for (const row of body as Record<string, unknown>[]) {
    for (const field of REQUIRED_FIELDS) if (row?.[field] == null) missing[field] += 1;
    const ticker = row?.Symbol;
    const closePrice = row?.ClosePrice;
    const tradeDate = typeof row?.TradeDate === 'string' ? TRADE_DATE.exec(row.TradeDate)?.[1] : undefined;
    const usablePrice = typeof closePrice === 'number' && Number.isFinite(closePrice) && closePrice > 0;
    if (typeof ticker !== 'string' || !TICKER.test(ticker) || !usablePrice || !tradeDate) {
      invalid += 1;
      continue;
    }
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    const change = row.PercChange;
    prices.push({ ticker, closePrice, changePercent: typeof change === 'number' ? change : 0, tradeDate });
  }
  return { prices, rows: body.length, invalid, missing };
}
