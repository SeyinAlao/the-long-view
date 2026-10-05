'use client';

import { ErrorState } from '@/components/ui/error-state';

// Catches anything a page below the root layout throws - the API down,
// a 500, or the server-side timeout in lib/backend-url.ts. The root
// layout sits outside this boundary, so the site header and navigation
// stay on screen and the rest of the site is still one click away.
// retry() re-fetches the page from the server, unlike reset().
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorState onRetry={retry} digest={error.digest} />;
}
