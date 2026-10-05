import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';

// Shown once, after Google sign-in replaced this account's password
// (the API redirects here with ?notice=google-now-sign-in). Nothing else
// from the query string is displayed.
const GOOGLE_NOW_SIGN_IN =
  'Google is now how you sign in. Your old password no longer works. Your drafts are still here.';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { notice } = await searchParams;
  const user = await getCurrentUserServer();

  // Belt and braces — proxy.ts already redirects unauthenticated
  // requests before they reach this far. If we somehow get here without
  // a user anyway, don't render a broken page.
  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Your desk</p>
      <h1 className="font-display mt-2 text-3xl">Welcome, {user.name}.</h1>
      {notice === 'google-now-sign-in' && (
        <p className="mt-4 max-w-prose rounded-md border border-ink/20 px-4 py-3 text-sm leading-relaxed text-ink" role="status">
          {GOOGLE_NOW_SIGN_IN}
        </p>
      )}
      {/* Email only: the username is already in the header. The email is
          the one detail shown nowhere else, and it's what tells you which
          account you're in when you switch between them. The page used to
          repeat the header's links here as buttons too. */}
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/90">Signed in as {user.email}</p>

      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/70">
        The leaderboard fills in as published calls reach their horizon and are graded against
        real prices.
      </p>
    </main>
  );
}
