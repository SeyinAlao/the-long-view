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
  build never depends on the API. The build waits at most 12 s for the
  API, then falls back. Next fails a page that takes more than 60 s to
  build (`staticPageGenerationTimeout`, default 60, in Next 16.3.8's
  `config-shared.js`), retrying twice first, and Render can take about
  46 s to wake, so the runtime's 90 s wait would fail the deploy.
  `npm run build:hanging-api` (frontend) builds against an API that
  never answers: it passes in about 30 s. Without the 12 s limit the
  same build failed after 3 attempts and 201 s.
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
  cache hit.
- **Partial check on Vercel (Preview, 6 October 2026, by Seyin in
  Chrome).** The captured `/feed` response was the router's prefetch
  (`x-matched-path: /feed.segments/_tree.segment.rsc`): `x-vercel-cache:
  STALE`, `age: 65`, `cache-control: public, max-age=0,
  must-revalidate`, `x-nextjs-prerender: 1`, with the full CSP, COOP,
  Permissions-Policy, nosniff, X-Frame-Options and HSTS. So Vercel's
  edge served the cached copy with every security header.
  `x-nextjs-postponed: 2` only marks a response from Next's per-segment
  prefetch cache; `1` would mean a partial (PPR) page, which we don't
  use. The only CSP block was Vercel's own Preview toolbar
  (`vercel.live`), which stays out of the policy.
- **Verified live (7 October 2026, by Seyin with curl, after #47 and
  #46 merged).** On the live site, `/feed`: first request
  `x-vercel-cache: PRERENDER`, `age: 0`; second `HIT`, `age: 53`.
  `/leaderboard`: first `PRERENDER`, `age: 0`; second `HIT`, `age: 24`.
  Both carried `cache-control: public, max-age=0, must-revalidate` and
  the full Content Security Policy. G5 is done.
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
