import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { getThesisServer } from '@/lib/server-theses';
import { CounterThesesSection } from '@/components/theses/counter-theses-section';

// Plain helper, not a component — Date.now() here doesn't trip React's
// purity rule the way calling it directly inside a component body
// would, since this function isn't itself a component or hook.
function getDaysRemaining(publishedAt: string | null, horizonDays: number): number | null {
  if (!publishedAt) return null;
  const resolveDate = new Date(new Date(publishedAt).getTime() + horizonDays * 24 * 60 * 60 * 1000);
  return Math.ceil((resolveDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// Despite living under the "(protected)" route group for file-tree
// convenience (it sits next to [id]/edit/), this route is deliberately
// NOT gated in proxy.ts — a published thesis has to be viewable by
// anyone, logged in or not. See proxy.ts's matcher, which only ever
// covers /theses/:id/edit, never plain /theses/:id.
export default async function ThesisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUserServer();
  const thesis = await getThesisServer(id);

  if (!thesis) {
    notFound();
  }

  // A draft has no business being shown on a "here's a locked public
  // record" page — even to its own author. Send them to actually edit
  // it instead.
  if (thesis.status === 'DRAFT') {
    if (user && user.id === thesis.author.id) {
      redirect(`/theses/${id}/edit`);
    }
    notFound();
  }

  const daysRemaining = getDaysRemaining(thesis.publishedAt, thesis.horizonDays);
  const counterTheses = thesis.counterTheses ?? [];
  // Logged in, not the original author, and hasn't already countered
  // this exact thesis (the backend's own unique constraint is the real
  // enforcement — this just avoids showing the form to someone who'd
  // immediately hit a 409 on submit).
  const canCounter =
    !!user &&
    user.id !== thesis.author.id &&
    !counterTheses.some((c) => c.author.id === user.id);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-lg tracking-[0.08em]">THE LONG VIEW</span>
        <Link href="/feed" className="text-[11px] text-muted hover:underline">
          Back to the ledger
        </Link>
      </div>
      <div className="mt-2 border-t border-ink/20" />

      <p className="mt-10 text-[11px] uppercase tracking-[0.1em] text-muted">
        {thesis.security.ticker} · by @{thesis.author.username}
      </p>
      <h1 className="font-display mt-2 text-3xl leading-tight sm:text-4xl">{thesis.security.companyName}</h1>
      <p className="mt-6 max-w-prose text-base leading-relaxed text-ink/90">{thesis.statement}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 border-y border-ink/15 py-6 sm:grid-cols-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Reference</p>
          <p className="font-mono text-sm">₦{thesis.referencePrice ?? '—'}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Target</p>
          <p className="font-mono text-sm">₦{thesis.targetPrice}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Conviction</p>
          <p className="font-mono text-sm">{thesis.conviction} / 10</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Horizon</p>
          <p className="font-mono text-sm">
            {daysRemaining !== null && daysRemaining > 0
              ? `${daysRemaining}d remaining`
              : daysRemaining !== null
                ? 'Awaiting evaluation'
                : '—'}
          </p>
        </div>
      </div>

      {(thesis.bullCase || thesis.baseCase || thesis.bearCase) && (
        <div className="mt-8 space-y-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">Scenarios</p>
          {thesis.bullCase && (
            <div>
              <p className="text-sm font-medium text-ink">Bull case</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{thesis.bullCase}</p>
            </div>
          )}
          {thesis.baseCase && (
            <div>
              <p className="text-sm font-medium text-ink">Base case</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{thesis.baseCase}</p>
            </div>
          )}
          {thesis.bearCase && (
            <div>
              <p className="text-sm font-medium text-ink">Bear case</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/80">{thesis.bearCase}</p>
            </div>
          )}
        </div>
      )}

      {thesis.metrics.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">Key metrics</p>
          <div className="mt-3 divide-y divide-ink/10">
            {thesis.metrics.map((metric) => (
              <div key={metric.id} className="flex justify-between py-2 text-sm">
                <span className="text-ink/70">{metric.label}</span>
                <span className="font-mono">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(thesis.catalysts || thesis.risks || thesis.invalidationCondition) && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {thesis.catalysts && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">Catalysts</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{thesis.catalysts}</p>
            </div>
          )}
          {thesis.risks && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">Risks</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{thesis.risks}</p>
            </div>
          )}
          {thesis.invalidationCondition && (
            <div className="sm:col-span-2">
              <p className="text-[11px] uppercase tracking-[0.1em] text-brass-dark">Invalidation</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/80">{thesis.invalidationCondition}</p>
            </div>
          )}
        </div>
      )}

      <CounterThesesSection thesisId={thesis.id} counterTheses={counterTheses} canCounter={canCounter} />
    </main>
  );
}
