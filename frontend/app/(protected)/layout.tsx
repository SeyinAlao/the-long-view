import type { ReactNode } from 'react';

// The real auth check now lives in proxy.ts (it runs before any page in
// this group renders), plus a defense-in-depth check in each page itself
// via getCurrentUserServer(). This layout stays a thin wrapper — shared
// chrome for authenticated routes (a nav bar, etc.) lands here whenever
// a later phase actually needs one.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
