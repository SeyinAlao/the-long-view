// Server Component by default — no 'use client', no hooks. If this page
// needs interactivity later, that interactivity becomes a small Client
// Component child, not a reason to convert this whole page.
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
        A public conviction ledger
      </p>
      <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">
        Publish a thesis on a Nigerian equity. Lock it. Let the market grade you.
      </h1>
      <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink/90">
        No editing, no quiet deletes. Disagreement takes the form of a published
        counter-thesis, not a comment.
      </p>

      {/* One button. The header already offers Publish a thesis, Sign in and
          the Leaderboard; repeating them here put Publish a thesis on the
          first screen twice. Reading the ledger is the natural first step. */}
      <div className="mt-8">
        <Link
          href="/feed"
          className="inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
        >
          Explore the ledger
        </Link>
      </div>
    </main>
  );
}
