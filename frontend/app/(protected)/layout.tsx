import type { ReactNode } from 'react';

// TODO (Phase 1): verify the session server-side here — read the session
// cookie, look up the user, redirect to /login if missing or invalid.
// Every route nested under (protected) inherits that check for free
// because it runs once in this layout rather than being repeated per page.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
