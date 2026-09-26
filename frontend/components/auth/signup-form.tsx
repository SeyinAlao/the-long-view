'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRegister, authErrorMessage } from '@/hooks/use-auth';
import { GoogleButton } from './google-button';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const register = useRegister(next ?? undefined);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    register.mutate({ email, username, name, password });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-16 sm:py-24">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">New thesis, new record</p>
      <h1 className="font-display mt-2 text-4xl">Make the reasoning legible.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        Publish a thesis. Lock it. Let the record speak.
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
          <label htmlFor="name" className="text-sm text-ink/80">
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
          />
        </div>
        <div>
          <label htmlFor="username" className="text-sm text-ink/80">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers, and underscores only"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
          />
        </div>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/20 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-brass"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>

        {register.isError && (
          <p className="text-sm text-terracotta" role="alert">
            {authErrorMessage(register.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/70">
        Already have an account?{' '}
        <Link href={loginHref} className="font-medium text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
