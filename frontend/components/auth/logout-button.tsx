'use client';

import { useLogout } from '@/hooks/use-auth';

export function LogoutButton() {
  const logout = useLogout();

  return (
    <button
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
    >
      {logout.isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
