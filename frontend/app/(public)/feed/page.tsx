import { fetchPublishedTheses } from '@/lib/theses';
import { loadForCachedPage } from '@/lib/cached-page-data';
import { ThesisFeedList } from '@/components/theses/thesis-feed-list';
import { LiveThesisFeed } from '@/components/theses/live-thesis-feed';

// Cached at Vercel's edge and regenerated in the background at most
// once a minute (ADR 013), so visitors never wait for a sleeping API. A
// new thesis appears within about a minute of publishing. A literal:
// Next.js requires one here.
export const revalidate = 60;

export default async function FeedPage() {
  const theses = await loadForCachedPage((init) => fetchPublishedTheses(undefined, init));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">The ledger</p>
      <h1 className="font-display mt-2 text-4xl">Published theses.</h1>

      <div className="mt-8">{theses ? <ThesisFeedList theses={theses} /> : <LiveThesisFeed />}</div>
    </main>
  );
}
