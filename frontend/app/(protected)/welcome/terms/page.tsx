import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/server-auth';
import { safeNextPath } from '@/lib/safe-next-path';
import { TermsAcceptForm } from '@/components/legal/terms-accept-form';

// Where anyone signed in without the current Terms accepted comes first:
// a new Google account, an account from before the checkpoint, or anyone
// after the Terms change (ADR 014). Then on to `next`.
export default async function WelcomeTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(typeof rawNext === 'string' ? rawNext : null) ?? '/dashboard';
  const user = await getCurrentUserServer();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/welcome/terms?next=${encodeURIComponent(next)}`)}`,
    );
  if (user.termsAccepted) redirect(next);

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-16 sm:py-24">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Before you continue</p>
      <h1 className="font-display mt-2 text-4xl">The Terms of the record.</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        To write or publish on The Long View, confirm you&apos;re 18 or older and agree to its Terms
        of Service and Privacy Policy. Reading needs nothing.
      </p>
      <TermsAcceptForm next={next} />
    </main>
  );
}
