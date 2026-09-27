import Link from 'next/link';
import { fetchPublishedTheses } from '@/lib/theses';
import { ThesisFeedCard } from '@/components/theses/thesis-feed-card';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const theses = await fetchPublishedTheses();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg tracking-[0.08em]">THE LONG VIEW</span>
        <Link href="/" className="text-[11px] text-muted hover:underline">
          Back to front page
        </Link>
      </div>
      <div className="mt-2 border-t border-ink/20" />

      <p className="mt-10 text-[11px] uppercase tracking-[0.1em] text-muted">The ledger</p>
      <h1 className="font-display mt-2 text-4xl">Published theses.</h1>

      <div className="mt-8">
        {theses.length === 0 ? (
          <p className="py-8 text-sm text-muted">Nothing published yet — the first call is still ahead.</p>
        ) : (
          theses.map((thesis) => <ThesisFeedCard key={thesis.id} thesis={thesis} />)
        )}
      </div>
    </main>
  );
}
