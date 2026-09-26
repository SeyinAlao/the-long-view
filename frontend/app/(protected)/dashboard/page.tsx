import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function DashboardPage() {
  const user = await getCurrentUserServer();

  // Belt and braces — proxy.ts already redirects unauthenticated
  // requests before they reach this far. If we somehow get here without
  // a user anyway, don't render a broken page.
  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Your desk</p>
          <h1 className="font-display mt-2 text-3xl">Welcome, {user.name}.</h1>
        </div>
        <LogoutButton />
      </div>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/90">
        Signed in as {user.email} · @{user.username}
      </p>

      <Link
        href="/theses/new"
        className="mt-8 inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Write a thesis
      </Link>

      <p className="mt-6 max-w-prose text-sm leading-relaxed text-ink/70">
        The rest of the ledger — a real feed of published theses, a page for each one, a
        leaderboard — is still ahead. This is the one working door into the record so far;
        more will open here as they&apos;re built.
      </p>
    </main>
  );
}
