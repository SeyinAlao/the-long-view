import type { ReactNode } from 'react';

// Shared chrome for logged-out routes (landing, public thesis reading,
// sign up / log in). Empty for now — a public nav bar lands with whichever
// phase actually needs one, not pre-built speculatively.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
