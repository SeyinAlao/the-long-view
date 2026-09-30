'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CounterThesisCard } from './counter-thesis-card';
import { CounterThesisForm } from './counter-thesis-form';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import type { CounterThesis } from '@/lib/theses';

interface CounterThesesSectionProps {
  thesisId: string;
  counterTheses: CounterThesis[];
  canCounter: boolean;
  // Set only for someone not signed in: where to sign in and come back
  // to this same thesis, ready to respond.
  signInHref?: string;
}

// The actual debate view — the original call already rendered above
// this by the page itself, and this is everyone who's disagreed with
// it, in the order they did. canCounter is computed server-side by the
// page (logged in, not the original author, hasn't already countered)
// so this component doesn't have to re-derive eligibility itself.
export function CounterThesesSection({ thesisId, counterTheses, canCounter, signInHref }: CounterThesesSectionProps) {
  const router = useRouter();
  const [justPublished, setJustPublished] = useState(false);

  function handlePublished() {
    setJustPublished(true);
    // Re-runs the server component's own data fetch in place — the page
    // is server-rendered, so this is what actually shows the new
    // counter, not just closing the form and hoping.
    router.refresh();
  }

  return (
    <section className="mt-8">
      <p className="text-[11px] uppercase tracking-[0.1em] text-terracotta">
        {counterTheses.length > 0 ? `The debate (${counterTheses.length})` : 'The debate'}
      </p>

      {counterTheses.length === 0 && (
        <p className="mt-3 text-sm text-muted">No one has published a counter-thesis to this yet.</p>
      )}

      <div className="mt-3 space-y-4">
        {counterTheses.map((counter) => (
          <CounterThesisCard key={counter.id} counter={counter} />
        ))}
      </div>

      {canCounter && !justPublished && (
        <div className="mt-6">
          <CollapsibleSection label="Publish a counter-thesis — disagree, on the record">
            <CounterThesisForm thesisId={thesisId} onPublished={handlePublished} />
          </CollapsibleSection>
        </div>
      )}

      {signInHref && (
        <p className="mt-6 text-sm text-ink/80">
          Disagree?{' '}
          <Link href={signInHref} className="font-medium text-ink underline underline-offset-4">
            Sign in to publish a counter-thesis
          </Link>
          .
        </p>
      )}
    </section>
  );
}
