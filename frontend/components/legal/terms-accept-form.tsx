'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useAcceptTerms, authErrorMessage } from '@/hooks/use-auth';
import { MUST_AGREE } from '@/lib/legal';
import { TermsCheckbox } from './terms-checkbox';

// The accept step's form. The button stays enabled: pressing it unticked
// explains why and moves focus to the box, which a disabled button can't
// do for a screen-reader user.
export function TermsAcceptForm({ next }: { next: string }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkbox = useRef<HTMLInputElement>(null);
  const accept = useAcceptTerms(next);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError(MUST_AGREE);
      checkbox.current?.focus();
      return;
    }
    accept.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <TermsCheckbox
        checked={agreed}
        onChange={(value) => {
          setAgreed(value);
          if (value) setError(null);
        }}
        error={error}
        inputRef={checkbox}
      />
      {accept.isError && (
        <p className="text-sm text-terracotta-dark" role="alert">
          {authErrorMessage(accept.error)}
        </p>
      )}
      <button
        type="submit"
        disabled={accept.isPending}
        className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {accept.isPending ? 'Saving…' : 'Agree and continue'}
      </button>
    </form>
  );
}
