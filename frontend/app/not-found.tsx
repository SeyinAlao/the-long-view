import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">404</p>
      <h1 className="font-display mt-2 text-4xl">This page isn&apos;t on the record.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        Whatever you were looking for doesn&apos;t live at this address. Check the link, or head
        back to the front page.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Back to the front page
      </Link>
    </main>
  );
}
