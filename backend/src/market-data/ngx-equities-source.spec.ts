import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchNgxEquities, NGX_EQUITIES_URL, parseNgxEquities } from './ngx-equities-source';

// Three real rows from NGX's equities JSON (6 October 2026), trimmed to
// the four fields we read. DANGCEM's PercChange is genuinely null.
const realRows: unknown = JSON.parse(readFileSync(join(__dirname, '__fixtures__/ngx-equities-sample.json'), 'utf-8'));

describe('parseNgxEquities', () => {
  it('turns real rows into prices, with a missing change as 0', () => {
    expect(parseNgxEquities(realRows)).toEqual({
      rows: 3,
      invalid: 0,
      missing: { Symbol: 0, ClosePrice: 0, TradeDate: 0 },
      prices: [
        { ticker: 'MTNN', closePrice: 847, changePercent: 0.59, tradeDate: '2026-10-06' },
        { ticker: 'DANGCEM', closePrice: 1066.7, changePercent: 0, tradeDate: '2026-10-06' },
        { ticker: 'GTCO', closePrice: 132.5, changePercent: 0.23, tradeDate: '2026-10-06' },
      ],
    });
  });

  it('skips and counts rows it cannot trust, and keeps the first of a repeated ticker', () => {
    const good = { Symbol: 'MTNN', ClosePrice: 847, PercChange: 0.59, TradeDate: '2026-10-06T00:00:00' };
    const parsed = parseNgxEquities([
      good,
      { ...good, ClosePrice: 900 },
      { ...good, Symbol: 'GTCO', ClosePrice: null },
      { ...good, Symbol: 'GTCO', ClosePrice: 0 },
      { ...good, Symbol: 'GTCO', ClosePrice: '132.5' },
      { ...good, Symbol: 'GTCO', ClosePrice: Number.POSITIVE_INFINITY },
      { ...good, Symbol: 'gtco' },
      { ...good, Symbol: 'GTCO', TradeDate: null },
      { ...good, Symbol: 'GTCO', TradeDate: '06/10/2026' },
      null,
    ]);
    expect(parsed.prices).toEqual([{ ticker: 'MTNN', closePrice: 847, changePercent: 0.59, tradeDate: '2026-10-06' }]);
    expect(parsed).toMatchObject({ rows: 10, invalid: 8, missing: { Symbol: 1, ClosePrice: 2, TradeDate: 2 } });
  });

  it.each([[undefined], [{ d: { results: [] } }], ['<html>'], [null]])('treats %p as no rows', (body) => {
    expect(parseNgxEquities(body)).toEqual({ prices: [], rows: 0, invalid: 0, missing: { Symbol: 0, ClosePrice: 0, TradeDate: 0 } });
  });
});

describe('fetchNgxEquities', () => {
  const respond = (body: string, status = 200) =>
    jest.fn().mockResolvedValue(new Response(body, { status, headers: { 'content-type': 'application/json; charset=utf-8' } }));

  it('makes exactly one request, asking for JSON, saying who it is, with a timeout', async () => {
    const fetchImpl = respond('[]');
    await fetchNgxEquities(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(NGX_EQUITIES_URL);
    expect(init.headers).toMatchObject({ accept: 'application/json;odata=verbose' });
    expect((init.headers as Record<string, string>)['user-agent']).toMatch(/^TheLongView\//);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports the status, type and length, and the parsed body', async () => {
    const result = await fetchNgxEquities(respond(JSON.stringify(realRows)));
    expect(result).toMatchObject({ status: 200, contentType: 'application/json; charset=utf-8' });
    expect(result.bodyLength).toBeGreaterThan(100);
    expect(result.body).toEqual(realRows);
  });

  it('keeps a non-JSON body out of the result, and passes an error status through', async () => {
    const result = await fetchNgxEquities(respond('<html>Access denied</html>', 403));
    expect(result).toEqual({ status: 403, contentType: 'application/json; charset=utf-8', bodyLength: 26, body: undefined });
  });

  it('lets a network failure or timeout reject, with no retry', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    await expect(fetchNgxEquities(fetchImpl)).rejects.toThrow(/timeout/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
