import Link from 'next/link';

// The one "something went wrong" page, shared by app/error.tsx (inside
// the normal layout, so the header and navigation stay usable) and
// app/global-error.tsx (when the layout itself failed). Plain markup, no
// hooks: the error files pass in the retry function and the digest.
//
// The digest is the only detail shown. In production Next.js replaces a
// Server Component's error message with a generic one, and the digest
// is what matches this failure to the server's log line.
export function ErrorState({ onRetry, digest }: { onRetry: () => void; digest?: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Unavailable</p>
      <h1 className="font-display mt-2 text-4xl">This page couldn&apos;t load.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/80">
        The ledger&apos;s server didn&apos;t answer properly. It may be restarting, so try again in a
        minute. Nothing that has been published is affected.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/" className="rounded-full border border-ink/30 px-5 py-3 text-sm font-medium text-ink">
          Back to the front page
        </Link>
      </div>
      {digest && <p className="mt-6 font-mono text-[11px] text-muted">Reference: {digest}</p>}
    </main>
  );
}
