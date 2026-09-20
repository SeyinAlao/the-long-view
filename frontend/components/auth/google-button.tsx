import { googleSignInUrl } from '@/lib/auth';

// Plain <a>, not a button with an onClick — this needs to be a real
// browser navigation to the backend, not a JS-handled click, since the
// backend does a server-side redirect to Google from here.
export function GoogleButton() {
  return (
    <a
      href={googleSignInUrl()}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
    >
      <i className="bx bxl-google text-base" aria-hidden="true" />
      Continue with Google
    </a>
  );
}
