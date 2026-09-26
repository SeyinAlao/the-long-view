'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import { useDiscardDraft } from '@/hooks/use-theses';
import type { Thesis } from '@/lib/theses';

interface ThesisRowProps {
  thesis: Thesis;
}

export function ThesisRow({ thesis }: ThesisRowProps) {
  const isDraft = thesis.status === 'DRAFT';
  const discard = useDiscardDraft();

  function handleDiscard(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Discard this draft? This can't be undone.")) {
      discard.mutate(thesis.id);
    }
  }

  const body = (
    <div className="flex items-center justify-between gap-4 border-b border-ink/10 py-4">
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium">{thesis.security.ticker}</p>
        <p className="mt-1 truncate text-sm text-ink/70">{thesis.statement}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-sm text-muted">₦{thesis.targetPrice}</p>
          <p className="mt-1 text-xs text-muted">
            {isDraft
              ? 'Draft'
              : thesis.publishedAt
                ? new Date(thesis.publishedAt).toLocaleDateString()
                : ''}
          </p>
        </div>
        {isDraft && (
          <button
            type="button"
            onClick={handleDiscard}
            disabled={discard.isPending}
            aria-label="Discard this draft"
            className="text-muted transition-colors hover:text-terracotta"
          >
            <i className="bx bx-trash text-base" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );

  if (isDraft) {
    return (
      <Link href={`/theses/${thesis.id}/edit`} className="block transition-opacity hover:opacity-70">
        {body}
      </Link>
    );
  }

  // No detail page yet — a published thesis is real and locked, but
  // there's nowhere to actually view it on its own yet. Shown here,
  // not linked, rather than pointing at a page that doesn't exist.
  return body;
}
