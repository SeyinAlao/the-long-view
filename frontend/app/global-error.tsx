'use client';

import './globals.css';
import { ErrorState } from '@/components/ui/error-state';

// Last resort, for when the root layout itself fails: it replaces the
// whole document, so it brings its own <html>, <body>, styles and
// <title> (metadata exports don't work in this file). The site's web
// fonts are left out; the fallback fonts in globals.css apply.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Unavailable - The Long View</title>
        <ErrorState onRetry={retry} digest={error.digest} />
      </body>
    </html>
  );
}
