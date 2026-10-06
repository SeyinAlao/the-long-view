import type { Thesis } from '@/lib/theses';
import { ThesisFeedCard } from './thesis-feed-card';

// The Ledger's list, whichever way its data arrived: rendered on the
// server into the cached page, or fetched in the browser when the build
// couldn't reach the API (LiveThesisFeed).
export function ThesisFeedList({ theses }: { theses: Thesis[] }) {
  if (theses.length === 0) {
    return <p className="py-8 text-sm text-muted">Nothing published yet — the first call is still ahead.</p>;
  }
  return theses.map((thesis) => <ThesisFeedCard key={thesis.id} thesis={thesis} />);
}
