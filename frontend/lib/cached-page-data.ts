import { PHASE_PRODUCTION_BUILD } from 'next/constants';

// Data for the pages Vercel caches and regenerates in the background
// (ISR): the Ledger and the Leaderboard (ADR 013).
//
// - During `next build` the API may be asleep or absent (CI builds with
//   no API at all), so a failure returns null and the page renders a
//   list that loads in the browser instead. The first regeneration
//   replaces it.
// - At runtime a failure throws. Next.js then keeps serving the last
//   good page and tries again on the next request (Next's ISR guide,
//   "Error handling and revalidation"). Caching an error page here
//   would show it to everyone until the next regeneration.
export async function loadForCachedPage<T>(load: (init: RequestInit) => Promise<T>): Promise<T | null> {
  try {
    return await load(testRevalidate());
  } catch (error) {
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw error;
    console.warn('API unavailable during build; this page loads in the browser until its first regeneration.');
    return null;
  }
}

// Next.js requires a page's `revalidate` export to be a literal, so a
// test build can't shorten it there. A fetch may lower it, though, so
// the browser tests set E2E_REVALIDATE_SECONDS to see regenerations in
// seconds rather than minutes. It caches the response in Next's data
// cache for that long, which production never does: there the fetch
// has no cache options, and Next fetches afresh on every regeneration.
// Ignored on Vercel, so it can never shorten production's interval.
function testRevalidate(): RequestInit {
  const seconds = Number(process.env.E2E_REVALIDATE_SECONDS);
  if (process.env.VERCEL || !Number.isInteger(seconds) || seconds <= 0) return {};
  return { next: { revalidate: seconds } };
}
