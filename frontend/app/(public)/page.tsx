// Server Component by default — no 'use client', no hooks. If this page
// needs interactivity later, that interactivity becomes a small Client
// Component child, not a reason to convert this whole page.
export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg tracking-[0.08em]">THE LONG VIEW</span>
        <span className="text-[11px] text-muted">Phase 0 — foundation</span>
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
        counter-thesis, not a comment. This is the foundation — the thesis feed, the
        debate view, and the publishing flow arrive in the phases after this one.
      </p>
    </main>
  );
}
