// One question, answered for real: can wherever this script runs
// actually reach NGX's page and get real prices back, or does it get
// blocked? A plain server-side fetch() got a 403 from a home
// connection; this exists to find out whether GitHub's own runners
// fare any differently, since they come from datacenter IP ranges bot
// protection often treats worse, not better.
//
// Calls the real MarketDataService methods, not a rewritten copy of
// its logic - this is the exact code path that would run in
// production. No database needed: fetchNgxPriceListPage() and
// parsePriceList() are both self-contained; only refreshPrices() (not
// called here) touches Prisma at all.
import { MarketDataService } from '../src/market-data/market-data.service';
import type { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const service = new MarketDataService(undefined as unknown as PrismaService);

  console.log('Fetching the live NGX price list page...');
  const rawText = await service.fetchNgxPriceListPage();
  console.log(`Fetched ${rawText.length} characters of page content.`);

  const parsed = service.parsePriceList(rawText);
  console.log(`Parsed ${parsed.length} ticker/price entries.`);

  if (parsed.length < 100) {
    // Matches refreshPrices()'s own real sanity threshold - fewer than
    // 100 entries means something is wrong (blocked, page changed,
    // served an error page), not that NGX genuinely has fewer than
    // 100 instruments listed today.
    console.error(
      `\n✕ Only ${parsed.length} entries parsed (expected 100+). This looks blocked or ` +
        'broken, not like a real, current NGX page.',
    );
    process.exit(1);
  }

  const sample = parsed.slice(0, 5);
  console.log('\n✓ Looks genuinely reachable. Sample of what was parsed:');
  for (const entry of sample) {
    console.log(`  ${entry.ticker}: ₦${entry.price} (${entry.changePercent >= 0 ? '+' : ''}${entry.changePercent}%)`);
  }
}

main().catch((error) => {
  console.error('\n✕ Fetch failed outright:', error instanceof Error ? error.message : error);
  process.exit(1);
});
