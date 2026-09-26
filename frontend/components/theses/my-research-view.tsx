'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyTheses } from '@/hooks/use-theses';
import { ThesisRow } from './thesis-row';
import { Skeleton } from '@/components/ui/skeleton';

type Tab = 'drafts' | 'published';

export function MyResearchView() {
  // Plain local state, on purpose — this toggle belongs to this one
  // component tree and nothing outside it needs to read or write it.
  // Zustand would be solving a problem this doesn't actually have.
  const [tab, setTab] = useState<Tab>('drafts');
  const { data: theses, isLoading } = useMyTheses();

  const drafts = theses?.filter((t) => t.status === 'DRAFT') ?? [];
  const published = theses?.filter((t) => t.status !== 'DRAFT') ?? [];
  const visible = tab === 'drafts' ? drafts : published;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Your desk</p>
      <h1 className="font-display mt-2 text-4xl">My research</h1>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('drafts')}
          className={
            tab === 'drafts'
              ? 'rounded-full bg-ink px-4 py-2 text-sm text-cream'
              : 'rounded-full border border-ink/20 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink/5'
          }
        >
          Drafts{drafts.length > 0 ? ` (${drafts.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('published')}
          className={
            tab === 'published'
              ? 'rounded-full bg-ink px-4 py-2 text-sm text-cream'
              : 'rounded-full border border-ink/20 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink/5'
          }
        >
          Published{published.length > 0 ? ` (${published.length})` : ''}
        </button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {tab === 'drafts' ? 'No drafts yet — start one below.' : 'Nothing published yet.'}
          </p>
        ) : (
          visible.map((thesis) => <ThesisRow key={thesis.id} thesis={thesis} />)
        )}
      </div>

      <Link
        href="/theses/new"
        className="mt-8 inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Start a new thesis
      </Link>
    </div>
  );
}
