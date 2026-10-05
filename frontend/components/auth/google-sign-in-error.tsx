'use client';

import { useSearchParams } from 'next/navigation';

// The API sends people back to /login?error=... when Google sign-in
// doesn't end in a session. Only these known codes show anything; any
// other value is ignored, so the text can't be set from a link.
const MESSAGES: Record<string, string> = {
  'google-link-refused':
    "An account with this email already has published work, so Google sign-in can't be added to it. Sign in with your email and password.",
  google: "Google sign-in didn't work. Try again, or sign in with your email and password.",
};

export function GoogleSignInError() {
  const message = MESSAGES[useSearchParams().get('error') ?? ''];
  if (!message) return null;
  return (
    <p className="mt-6 text-sm leading-relaxed text-terracotta-dark" role="alert">
      {message}
    </p>
  );
}
