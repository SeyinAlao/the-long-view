// Server Component by default — no 'use client', no hooks. If this page
// needs interactivity later, that interactivity becomes a small Client
// Component child, not a reason to convert this whole page.
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg tracking-[0.08em]">THE LONG VIEW</span>
        <span className="text-[11px] text-muted">A public conviction ledger</span>
      </div>
      <div className="mt-2 border-t border-ink/20" />

      <p className="mt-10 text-[11px] uppercase tracking-[0.1em] text-muted">
        A public conviction ledger
      </p>
      <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">
        Publish a thesis on a Nigerian equity. Lock it. Let the market grade you.
      </h1>
      <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink/90">
        No editing, no quiet deletes. Disagreement takes the form of a published
        counter-thesis, not a comment.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/feed"
          className="inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
        >
          Explore the ledger
        </Link>
        <Link
          href="/signup"
          className="inline-block rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          Publish a thesis
        </Link>
        <Link
          href="/leaderboard"
          className="inline-block rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          The leaderboard
        </Link>
      </div>
    </main>
  );
}
