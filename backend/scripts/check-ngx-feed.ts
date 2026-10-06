// Read-only check of NGX's price feed: one request, the same checks the
// real refresh applies, and a few closing prices to compare with NGX's
// official list. No database and no .env: it imports neither Prisma nor
// dotenv, so it can never write anywhere. Safe at any hour; inside NGX
// trading hours (9:00am-4:30pm Lagos) the prices are intraday, not closes.
// Run with: npm run market-data:check (from backend/).
import { fetchNgxEquities } from '../src/market-data/ngx-equities-source';
import { assessFeed } from '../src/market-data/feed-checks';

const SPOT_CHECK = ['MTNN', 'DANGCEM', 'GTCO'];

async function main() {
  const { prices, tradeDate, diagnostics } = assessFeed(await fetchNgxEquities(), new Date());
  console.log(`OK: ${prices.length} usable prices, trade date ${tradeDate}.`);
  console.log(diagnostics);
  for (const ticker of SPOT_CHECK) {
    const price = prices.find((p) => p.ticker === ticker);
    console.log(`${ticker}: ${price ? `close ${price.closePrice}, change ${price.changePercent}%` : 'not listed'}`);
  }
}

main().catch((error: Error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
