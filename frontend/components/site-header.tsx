'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';

const linkClass = 'text-ink/80 underline-offset-4 hover:text-ink hover:underline';
const activeClass = 'text-ink underline underline-offset-4';
// Slightly smaller below the sm breakpoint, so the wordmark and the
// button still share one line on a 320px-wide phone.
// Shape and colour are kept apart so the loading placeholder can reuse
// the exact shape: it renders the same text, invisibly, so it is the
// button's size by construction - no guessed pixel values to drift.
// Slightly smaller below sm, so the wordmark and the button still share
// one line on a 320px-wide phone.
const pillShape =
  'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium sm:px-4 sm:py-2 sm:text-sm';
const pillClass = `${pillShape} bg-ink text-cream transition-opacity hover:opacity-90`;
const placeholder = 'animate-pulse bg-ink/10 text-transparent select-none';

// The one header on every page: the way home, the way around, and
// sign-in / sign-out from anywhere.
//
// Two fixed lines, so the layout never depends on username length or
// screen width: the wordmark and the one main action on the first, the
// text links on the second.
//
// Who's signed in is checked in the browser after the page loads rather
// than on the server, so a public page like the homepage stays fast even
// when the backend is asleep. Until that answer arrives - up to a minute
// if the API is waking up - the account parts show pulsing placeholders
// of the same size: never a "Sign in" that flashes and then turns into a
// username, and never a header that looks finished but has parts
// missing.
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
        {authKnown ? (
          <Link href="/theses/new" className={pillClass}>
            {user ? 'Write a thesis' : 'Publish a thesis'}
          </Link>
        ) : (
          <span aria-hidden="true" className={`${pillShape} ${placeholder}`}>
            Publish a thesis
          </span>
        )}
      </div>

      <nav aria-label="Main" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {navLink('/feed', 'Ledger')}
        {navLink('/leaderboard', 'Leaderboard')}

        {!authKnown && (
          <span aria-hidden="true" className={`rounded ${placeholder}`}>
            Sign in
          </span>
        )}

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
