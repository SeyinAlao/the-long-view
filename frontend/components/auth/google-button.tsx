'use client';

import { useEffect, useState } from 'react';
import { googleSignInUrl } from '@/lib/auth';

// Plain <a>, not a button with an onClick handler doing the navigation -
// this has to be a real browser navigation, since the backend answers
// with a server-side redirect to Google.
//
// The click still gets immediate feedback, though. Once deployed, the
// backend may be asleep and take up to a minute to answer; without
// this, the button would look dead for that whole time, and people
// click again or leave.
export function GoogleButton({ next }: { next?: string | null }) {
  const [connecting, setConnecting] = useState(false);

  // If someone clicks, then comes back with the browser's Back button,
  // the browser can restore this page exactly as it was left - stuck on
  // "Connecting…". Reset whenever the page is shown again.
  useEffect(() => {
    const reset = () => setConnecting(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  return (
    <a
      href={googleSignInUrl(next)}
      onClick={(e) => {
        if (connecting) {
          e.preventDefault(); // one navigation is enough
          return;
        }
        setConnecting(true);
      }}
      aria-busy={connecting}
      aria-disabled={connecting}
      className={`flex w-full items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5 ${connecting ? 'opacity-60' : ''}`}
    >
      <i className="bx bxl-google text-base" aria-hidden="true" />
      {connecting ? 'Connecting to Google…' : 'Continue with Google'}
    </a>
  );
}
