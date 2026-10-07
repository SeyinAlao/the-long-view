import Link from 'next/link';
import type { Ref } from 'react';
import { DISCLAIMER, PRIVACY_PATH, TERMS_PATH } from '@/lib/legal';

interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error: string | null;
  inputRef: Ref<HTMLInputElement>;
}

// The agreement, wherever it's asked for (sign-up, the accept step):
// a real, unticked checkbox with its label, the documents linked, and an
// error tied to it and announced (ADR 014, WCAG 2.2 AA). It includes the
// age declaration: 18 or older, self-declared, not verified.
export function TermsCheckbox({ checked, onChange, error, inputRef }: TermsCheckboxProps) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          ref={inputRef}
          id="accept-terms"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'accept-terms-error' : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-ink"
        />
        <label htmlFor="accept-terms" className="text-sm leading-relaxed text-ink/80">
          I&apos;m 18 or older. I agree to the{' '}
          <Link href={TERMS_PATH} className="font-medium text-ink underline underline-offset-2">
            Terms of Service
          </Link>{' '}
          and the{' '}
          <Link href={PRIVACY_PATH} className="font-medium text-ink underline underline-offset-2">
            Privacy Policy
          </Link>
          , and I understand: {DISCLAIMER}
        </label>
      </div>
      {error && (
        <p id="accept-terms-error" role="alert" className="mt-2 text-sm text-terracotta-dark">
          {error}
        </p>
      )}
    </div>
  );
}
