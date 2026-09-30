'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';

const linkClass = 'text-ink/80 underline-offset-4 hover:text-ink hover:underline';
const activeClass = 'text-ink underline underline-offset-4';
// Slightly smaller below the sm breakpoint, so the wordmark and the
// button still share one line on a 320px-wide phone.
const pillClass =
  'shrink-0 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[13px] font-medium text-cream transition-opacity hover:opacity-90 sm:px-4 sm:py-2 sm:text-sm';

// The one header on every page: the way home, the way around, and
// sign-in / sign-out from anywhere.
//
// Two fixed lines, so the layout never depends on username length or
// screen width: the wordmark and the one main action on the first, the
// text links on the second.
//
// Who's signed in is checked in the browser after the page loads rather
// than on the server, so a public page like the homepage stays fast even
// when the backend is asleep. Until that answer arrives, the account
// parts render nothing at all - never a "Sign in" that flashes and then
// turns into a username.
export function SiteHeader() {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const logout = useLogout();

  const authKnown = currentUser.isSuccess || currentUser.isError;
  const user = currentUser.isSuccess ? (currentUser.data?.user ?? null) : null;

  // Send people back to the page they were on after signing in - except
  // from the homepage or the auth pages themselves, where the dashboard
  // is the more useful destination.
  const returnHere = pathname !== '/' && pathname !== '/login' && pathname !== '/signup';
  const signInHref = returnHere ? `/login?next=${encodeURIComponent(pathname)}` : '/login';

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} className={active ? activeClass : linkClass}>
        {label}
      </Link>
    );
  };

  return (
    <header className="mx-auto max-w-2xl px-5 pt-6 sm:px-8">
      {/* min-h keeps this line the same height before and after the
          button appears, so nothing below it jumps. */}
      <div className="flex min-h-9 items-center justify-between gap-4">
        <Link href="/" className="whitespace-nowrap font-display text-base tracking-[0.08em] text-ink sm:text-lg">
          THE LONG VIEW
        </Link>
        {authKnown && (
          <Link href="/theses/new" className={pillClass}>
            {user ? 'Write a thesis' : 'Publish a thesis'}
          </Link>
        )}
      </div>

      <nav aria-label="Main" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {navLink('/feed', 'Ledger')}
        {navLink('/leaderboard', 'Leaderboard')}

        {authKnown && !user && (
          <Link href={signInHref} className={pathname === '/login' ? activeClass : linkClass}>
            Sign in
          </Link>
        )}

        {authKnown && user && (
          <>
            {navLink('/theses/mine', 'My research')}
            {navLink('/dashboard', `@${user.username}`)}
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className={`${linkClass} disabled:opacity-50`}
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        )}
      </nav>
      <div className="mt-3 border-t border-ink/20" />
    </header>
  );
}
