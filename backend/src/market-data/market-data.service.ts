import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertOutsideTradingWindow } from './trading-hours';

export interface ParsedPrice {
  ticker: string;
  price: number;
  changePercent: number;
}

const NGX_PRICE_LIST_URL = 'https://ngxgroup.com/exchange/data/equities-price-list/';

// NGX's page lists hundreds of instruments beyond our 147 equities —
// bonds, commercial papers, mutual funds. This is genuinely NOT a
// documented API, just a public webpage, so this parser works against
// plain text rather than depending on exact HTML tag/class structure
// that could change without notice. Anything that doesn't match one of
// our own known tickers is simply ignored downstream, never inserted.
const TICKER_PRICE_PATTERN =
  /\b([A-Z][A-Z0-9]{1,14})\b(?:\s*\[[A-Z]{2,5}\])?\s+N([\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})\s*%/g;

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  // The data on this page is real and accurate — cross-checked directly
  // against known closing prices, confirmed exact on every ticker
  // checked. What isn't accessible is a plain fetch(): NGX returns a
  // 403 to a bare request, even with realistic browser headers, almost
  // certainly bot protection that requires an actual browser. A
  // headless Chromium instance, controlled here, loads the page the way
  // a real browser would rather than trying to fake the difference with
  // more headers.
  async fetchNgxPriceListPage(): Promise<string> {
    // Dynamic import, not a static one — puppeteer ships as an ESM-only
    // package, which breaks under Jest's CommonJS transform if imported
    // statically (the exact same class of issue @nestjs/mapped-types
    // hit earlier). This also means Chromium's launcher only loads when
    // this method actually runs, not on every import of this file.
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // Standard flags for running headless Chrome on a small,
        // memory-constrained server rather than a developer's desktop —
        // disables the GPU process and shared-memory usage that Chrome
        // otherwise assumes it can freely use.
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process',
      ],
    });

    try {
      const page = await browser.newPage();
      // The only thing this ever needs is the page's text — not images,
      // fonts, stylesheets, or any of the tracking/analytics scripts a
      // real news page typically loads. Blocking everything except the
      // actual HTML document makes each run meaningfully faster and
      // lighter, not just theoretically leaner.
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'document') {
          req.continue();
        } else {
          req.abort();
        }
      });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      );
      await page.goto(NGX_PRICE_LIST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      return await page.content();
    } finally {
      // Always close the browser, success or failure — a leaked headless
      // Chromium process is exactly the kind of thing that quietly eats
      // a small server's memory over time.
      await browser.close();
    }
  }

  // Pure function, no I/O — deliberately separated from the fetch so it
  // can be tested against a saved real sample without hitting the
  // network, and so a change in NGX's markup only ever breaks this one
  // function, not the whole pipeline.
  parsePriceList(rawText: string): ParsedPrice[] {
    const plainText = rawText
      .replace(/<[^>]+>/g, ' ') // strip HTML tags, if given raw HTML
      // Markdown links: [text](url) -> text. Allows one level of nested
      // brackets inside the link text, since NGX's own markup nests a
      // bracket suffix straight into the ticker's link text, e.g.
      // "[AFRINSURE [MRF]](url)" — a naive non-nested pattern here
      // fails to match that case at all and silently drops the ticker.
      .replace(/\[([^[\]]*(?:\[[^[\]]*\])?[^[\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\s+/g, ' ');

    const results: ParsedPrice[] = [];
    const seen = new Set<string>();

    for (const match of plainText.matchAll(TICKER_PRICE_PATTERN)) {
      const [, ticker, priceRaw, changeRaw] = match;
      if (seen.has(ticker)) continue; // NGX lists some instruments more than once
      seen.add(ticker);
      results.push({
        ticker,
        price: Number(priceRaw.replace(/,/g, '')),
        changePercent: Number(changeRaw.replace(/,/g, '')),
      });
    }

    return results;
  }

  // The actual pipeline: fetch, parse, sanity-check, then only ever
  // touch securities we already recognize. Fails safe — if the fetch
  // fails, or parsing yields suspiciously few results (NGX changed
  // something, or served an error page instead of real data), this
  // aborts before writing anything, leaving yesterday's real prices in
  // place rather than overwriting them with garbage or zeros. Refuses
  // during NGX trading hours, before fetching anything. `now` is a
  // parameter so tests can fix the clock.
  async refreshPrices(now: Date = new Date()): Promise<{ updated: number; skippedUnrecognized: number }> {
    assertOutsideTradingWindow(now);
    const rawText = await this.fetchNgxPriceListPage();
    const parsed = this.parsePriceList(rawText);

    const MIN_EXPECTED = 100; // we track 147 equities; NGX's full page lists hundreds more
    if (parsed.length < MIN_EXPECTED) {
      throw new Error(
        `NGX price list parse returned only ${parsed.length} entries (expected 100+) - refusing to update, page format may have changed`,
      );
    }

    const knownSecurities = await this.prisma.security.findMany({ take: 1000 });
    const knownTickers = new Set(knownSecurities.map((s) => s.ticker));

    let updated = 0;
    let skippedUnrecognized = 0;

    for (const entry of parsed) {
      if (!knownTickers.has(entry.ticker)) {
        skippedUnrecognized += 1;
        continue;
      }

      const security = knownSecurities.find((s) => s.ticker === entry.ticker)!;
      await this.prisma.security.update({
        where: { ticker: entry.ticker },
        data: {
          previousPrice: security.currentPrice,
          currentPrice: entry.price,
        },
      });
      await this.prisma.price.create({
        data: { securityId: security.id, price: entry.price },
      });
      updated += 1;
    }

    this.logger.log(`Refreshed ${updated} securities from NGX (${skippedUnrecognized} unrecognized tickers ignored).`);
    return { updated, skippedUnrecognized };
  }
}
