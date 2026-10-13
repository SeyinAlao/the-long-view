import type { Ref } from 'react';
import { DISCLAIMER } from '@/lib/legal';

interface PublishConfirmationProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
}

// Publishing is permanent, so the author confirms what it means every
// time (ADR 014). A real checkbox, unticked, its error tied to it and
// announced. The API refuses a publish without the confirmation too.
export function PublishConfirmation({ checked, onChange, error, inputRef }: PublishConfirmationProps) {
  return (
    <div>
      <p className="max-w-prose text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
      <div className="mt-3 flex items-start gap-3">
        <input
          ref={inputRef}
          id="confirm-publish"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'confirm-publish-error' : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-ink"
        />
        <label htmlFor="confirm-publish" className="text-sm leading-relaxed text-ink/80">
          I understand this is published as my own opinion, not investment advice, and that a published thesis
          can&apos;t be edited or deleted.
        </label>
      </div>
      {error && (
        <p id="confirm-publish-error" role="alert" className="mt-2 text-sm text-terracotta-dark">
          {error}
        </p>
      )}
    </div>
  );
}
