# 013 — The Ledger and Leaderboard are cached pages (ISR)

## Decision

`/feed` (the Ledger) and `/leaderboard` are static pages that Next.js
regenerates in the background (Incremental Static Regeneration), and
Vercel serves them from its edge cache.

- **Intervals, time-based only:** `revalidate = 60` on the Ledger and
  `300` on the Leaderboard, which only changes after the evening
  evaluation job. There is no Server Action and no on-demand
  revalidation, so nothing a visitor does can force a regeneration.
- **A new thesis appears on the Ledger within about a minute**: the
  first request after the interval still gets the old page and starts
  the regeneration; the next request gets the new one.
- **The server fetch has no cache options.** Next fetches afresh on
  every regeneration and never keeps the API's response in its data
  cache. (Read from `next/dist/server/lib/patch-fetch.js`, Next 16.3.8:
  an un-optioned fetch is "auto no cache" at runtime, and that doesn't
  make an ISR route dynamic.)
- **One list component per page** (`ThesisFeedList`, `LeaderboardList`)
  renders the data whichever way it arrived.

## When the API fails

`lib/cached-page-data.ts` decides:

- **During `next build`** a failure is tolerated. The page is built
  with a list that loads in the browser through TanStack Query
  (`LiveThesisFeed`, `LiveLeaderboard`), and the first regeneration
  replaces it. CI's frontend job builds with no API, so it proves the
  build never depends on the API. On Vercel, the build waits for a
  sleeping API (up to the 90 s server timeout) before falling back.
- **At runtime** a failure throws, and Next keeps serving the last good
  page (Next's ISR guide, "Error handling and revalidation"). Next then
  re-stores that page and retries after the page's interval, clamped
  to between 3 and 30 seconds (`next/dist/server/response-cache/index.js`).
  So during an outage each page tries to regenerate at most about every
  30 seconds, not on every request, and visitors keep seeing the last
  good page rather than an error.

A page rendered on every request (a thesis, My research) still shows
the error page when the API fails (the error pages from PR #30, G1).

## Why

Render's free API sleeps after 15 idle minutes and takes about 46 s to
wake. The two busiest public pages shouldn't wait for it or fail with
it. Both pages are the same for everyone (the header's account state
loads in the browser), so one cached copy is safe to share.

## Checked

- The fixed Content Security Policy (ADR 011) is a `next.config` header,
  so it's sent with cached pages too. The browser tests check it on a
  cache hit, and on a Vercel Preview it's checked by hand alongside
  `x-vercel-cache: HIT` and a growing `age` on a second request.
- The API sends `Cache-Control: no-store` (ADR 011). That doesn't stop
  the pages being cached: Next's page cache follows the page's
  `revalidate`, not the API's response headers.

## Tests

- `revalidate` must be a literal (Next's docs), so a test build can't
  shorten it there. A fetch may lower it, so the browser tests set
  `E2E_REVALIDATE_SECONDS=2`, which adds `next.revalidate` to the fetch.
  That caches the response in Next's data cache for 2 s, which
  production never does. It's ignored when `VERCEL` is set.
- Playwright starts the API, relay and fake Google before the frontend,
  so the test build always reaches the API. The build-time fallback was
  checked once by hand, with the relay failing during the build.
- `e2e/tests/cached-pages.spec.ts`: a cache hit with the security
  headers; a new thesis appearing after a regeneration; a failed
  regeneration keeping the last good Ledger and Leaderboard (and the
  Ledger recovering afterwards). Swallowing the runtime error instead
  of throwing fails both failure tests.
- The cold-start and error-page tests now use a thesis page, which is
  still rendered on every request.

## Cost on Vercel Hobby

At most one regeneration per page per interval while people visit:
about 60 an hour for the Ledger and 12 for the Leaderboard. Each is one
function invocation and one API call. During an outage, at most about
120 failed attempts an hour per page.
