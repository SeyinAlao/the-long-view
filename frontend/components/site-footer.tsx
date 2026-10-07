import Link from 'next/link';
import { DISCLAIMER, PRIVACY_PATH, TERMS_PATH } from '@/lib/legal';

interface SiteFooterProps {
  // The NGX attribution ("Source: NGX, prices as of <date>"), for pages
  // that show prices. A slot for now: the date comes from the newest
  // price's trade date, read when a cached page regenerates (backlog).
  priceSource?: { asOf: string };
}

// On every page, from the root layout. A Server Component with no data
// of its own, so the cached Ledger and Leaderboard (ADR 013) keep it.
export function SiteFooter({ priceSource }: SiteFooterProps) {
  return (
    <footer className="mx-auto max-w-2xl border-t border-ink/15 px-5 py-8 text-xs leading-relaxed text-muted sm:px-8">
      <p className="max-w-prose">{DISCLAIMER}</p>
      {priceSource && <p className="mt-2">Source: NGX, prices as of {priceSource.asOf}.</p>}
      <nav aria-label="Legal" className="mt-3 flex gap-4">
        <Link href={TERMS_PATH} className="underline underline-offset-4">
          Terms of Service
        </Link>
        <Link href={PRIVACY_PATH} className="underline underline-offset-4">
          Privacy Policy
        </Link>
      </nav>
    </footer>
  );
}
