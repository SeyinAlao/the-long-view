'use client';

// What a browser-loaded list shows before its data arrives, or when the
// API fails. Used only in a cached page whose build couldn't reach the
// API (lib/cached-page-data.ts), so it sits inside that page's <main>
// rather than replacing it like the route skeletons and error page do.
export function LiveListStatus({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  if (!failed) {
    return (
      <p role="status" className="py-8 text-sm text-muted">
        Loading…
      </p>
    );
  }
  return (
    <div role="alert" className="py-8 text-sm text-ink/80">
      <p>The ledger&apos;s server didn&apos;t answer properly. It may be restarting, so try again in a minute.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
