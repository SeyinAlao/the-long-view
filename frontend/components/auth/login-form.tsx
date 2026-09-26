'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLogin, authErrorMessage } from '@/hooks/use-auth';
import { GoogleButton } from './google-button';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  // proxy.ts sets ?next=<original path> when it redirects someone here
  // for a protected page. Falls back to the login hook's own default
  // (/dashboard) when there wasn't one — e.g. someone who just opened
  // /login directly, not because a protected route sent them here.
  const next = searchParams.get('next');
  const login = useLogin(next ?? undefined);
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-16 sm:py-24">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Sign in</p>
      <h1 className="font-display mt-2 text-4xl">Welcome back.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        Publish your thinking, show your work, and let the record speak.
      </p>

      <div className="mt-8">
        <GoogleButton />
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink/15" />
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted">or continue with email</span>
        <div className="h-px flex-1 bg-ink/15" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm text-ink/80">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-ink/80">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
          />
        </div>

        {login.isError && (
          <p className="text-sm text-terracotta" role="alert">
            {authErrorMessage(login.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/70">
        Don&apos;t have an account?{' '}
        <Link href={signupHref} className="font-medium text-ink underline underline-offset-2">
          Create one
        </Link>
      </p>
    </div>
  );
}
