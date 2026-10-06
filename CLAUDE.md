# The Long View

A public conviction ledger for Nigerian equities: publish a thesis on an NGX
stock, it locks, and it gets graded against real prices when its horizon ends.
Counter-theses are the only form of disagreement. Solo side project by Seyin,
built to be shown publicly. **Hard constraint: free tiers only, no spending.**

## Stack and layout

npm workspaces monorepo. Run installs from the repo root.

- `backend/` - NestJS 11, Prisma 7 (PrismaPg adapter), PostgreSQL on Neon
- `frontend/` - Next.js 16 App Router, React 19, TanStack Query, Zustand, Tailwind v4
- `e2e/` - Playwright browser tests (+ axe-core), run against a real API,
  frontend and a delay relay; CI job "Browser tests"
- `docs/decisions/` - ADRs 001-013. Read the relevant one before changing that area.
- `docs/deployment.md` - runbook: hosts, every env var, setup order, migrations
- `docs/backlog.md` - agreed deferred work, split before / after launch

## Commands

Backend (`backend/`): `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `build`,
`db:seed`, `market-data:refresh`, `market-data:check` (read-only: no
database, no `.env`), `evaluate:pending`.
Frontend (`frontend/`): `dev`, `lint`, `typecheck`, `build`.
Root: `test:browser` (Playwright; builds and starts everything itself).

Before any commit, run lint, typecheck, test and build for every side touched,
plus test:e2e for backend changes and test:browser for anything a page touches.

**Tests that wipe their database** (backend e2e, browser tests) refuse to run
unless the database name contains `test`. Locally they use a native Postgres 18
(`the_long_view_test` on localhost) via the gitignored `backend/.env.test.local`
- no internet, about 10 s for backend e2e. One-time setup and how to run:
docs/deployment.md, "Running the tests locally". CI is the authoritative run.
`backend/.env` points at the **production** branch's `neondb` (checked
2 October 2026; not staging, which the site uses): never point tests at it, or
at staging. The test backend always runs with `DISABLE_SCHEDULED_JOBS=true`.

## Standards (set by Seyin - non-negotiable)

- Senior-engineer quality. Right tool for each job: TanStack Query for server
  data, never useEffect for fetching; useEffect only for real external
  subscriptions (timers, browser events) - and prefer CSS if CSS can do it.
- Small, focused files - nothing near 300 lines, no files full of stray
  constants. Keep the app light; justify every dependency.
- Verify, never assume. Read the code before changing it, check the real
  current docs before relying on a product or library detail, and prove a
  fix with a test that fails without it. Say plainly what was not verified.
- Accessibility: WCAG 2.2 AA. Text tokens have measured contrast ratios in
  `frontend/app/globals.css` (ADR 008). One global :focus-visible rule; never
  add `outline-none`.
- Never put secrets (connection strings, passwords, client secrets) in chat,
  commits or logs.

## Workflow

- Branches: `feature/...`, `fix/...`, `chore/...`, `test/...`, `docs/...`
- Conventional commits, several focused commits per PR, each with a body
  explaining why and how it was verified.
- PR description: What changed / Why / How this was tested / Related.
- CI (`.github/workflows/ci.yml`) runs on PRs to `master`; merge only when green.
- Seyin is on Windows/PowerShell. CRLF warnings are harmless. If
  `frontend/next-env.d.ts` shows as modified, `git restore` it - Next.js
  regenerates it and it is never part of a change.

## Key rules in the code (don't regress these)

- Published theses are immutable - no edits, no deletes. Drafts can change
  anything, including the company.
- Reference price = latest row in the `Price` history, at most 7 days old;
  publishing is refused (409) otherwise. Never `Security.currentPrice`, which
  the seed fills with a 100.00 placeholder (ADR 004).
- Browser calls go to `/api/...` on the frontend's own domain, rewritten to the
  API, so the session cookie is first-party (ADR 007). Server code uses
  `BACKEND_URL`.
- `proxy.ts` only checks a session cookie exists on protected pages; each page
  verifies the session itself. /login and /signup do verify (prevents a loop).
- `safeNextPath` guards every post-sign-in redirect (open-redirect fix).
- Emails are stored lowercased (`normaliseEmail`) in a `citext` column; one
  address is one account in any letter case.
- Google sign-in joins an existing account only through `GoogleLinkService`
  (ADR 003): never onto a different Google id; never onto a password account
  with public activity (`PublicActivityService` - extend it when comments or
  reactions ship); otherwise it removes the password and ends all sessions,
  in one Serializable transaction. Only verified Google emails are accepted.
- Google sign-in `state` is a signed `oauth_state` cookie (`Path=/`,
  `SameSite=Lax`, 10 min) via `SignedCookieStateStore`; always pass `state`
  as an object (a string skips the store). It carries `next`, checked by the
  API's own `safeNextPath`. passport-oauth2 and passport-google-oauth20 are
  pinned exactly. `GOOGLE_*_URL` overrides are test-only (127.0.0.1, never
  in production or render.yaml).
- Session tokens carry the user's `sessionVersion` (`sv`); signing out raises
  it and ends every session on every device (ADR 002). The cookie stays
  explicitly `SameSite=Lax`: it is what stops a cross-site sign-out.
- Prisma migrations run without a transaction: wrap multi-statement ones in
  `BEGIN; ... COMMIT;`, and always set `DIRECT_URL` first (prisma.config.ts
  loads `backend/.env`, which is production). docs/deployment.md.
- Signing in or out clears the TanStack Query cache and the unsaved-draft
  autosave (account switching on a shared browser).
- Rate limits (ADR 010): the API never reads `X-Forwarded-For`,
  `X-Real-IP` or `req.ip`. The client IP comes only from
  `x-tlv-client-ip` on a request carrying `EDGE_PROXY_KEY`, which
  `proxy.ts` adds to every `/api` call (after dropping any `x-tlv-*` the
  browser sent) and server-side fetches send too. Every limit number
  lives in `backend/src/security/rate-limits.ts`. Security log lines go
  through `SecurityLog` only: refs, never emails, IPs, tokens or messages.
- The Ledger (`/feed`) and Leaderboard are cached pages (ISR, ADR 013):
  `revalidate = 60` and `300`, literals, time-based only, no Server
  Action or on-demand revalidation. Their data goes through
  `loadForCachedPage`: a failure is tolerated only during `next build`
  and throws at runtime, so Next keeps the last good page. Never use
  request-time APIs (`cookies()`, `headers()`) on them, and never give
  their fetch `no-store`: either makes them dynamic.
- Security headers (ADR 011): one fixed CSP for all pages, set in
  `frontend/security-headers.ts` - no nonce, which would make every page
  dynamic and break G5's caching. Never add `eval`, inline event
  handlers or another site's scripts. Zod stays `jitless`. The browser
  tests fail on any CSP violation, so pass functions (never strings) to
  `waitForFunction`. The `/api` rule (`x-vercel-enable-rewrite-caching:
  0`) stays the only header rule on `/api`; the API adds its own,
  including `Cache-Control: no-store`.
- In-process cron jobs are off when `DISABLE_SCHEDULED_JOBS=true` (Render).
- NGX trading hours are 9:00am-4:00pm WAT since 27 April 2026. Don't assume
  the old 2:30pm close anywhere.
- Prices come from NGX's equities JSON (ADR 012): one request per run,
  no retry, an honest User-Agent, and only `ngx-equities-source.ts`
  knows the source (everything else uses `MarketPrice`). A refresh
  refuses and writes nothing on a non-200, fewer than 100 usable prices,
  or a newest trade date more than 5 days old in Lagos. Refusals log
  counts only, never response content. NGX's terms forbid automated
  collection without written consent. Seyin is asking NGX for permission
  and accepts the risk until it answers, on four conditions (ADR 012):
  don't add requests, keep the User-Agent honest, show "Source: NGX,
  prices as of <date>" before the public stage, and never republish
  NGX's full price list. So a company in any API response has only
  `PUBLIC_SECURITY_FIELDS` (id, ticker, companyName), selected in the
  query; never return `currentPrice` or `previousPrice`. The company
  search offers only companies with at least one Price row.
- `refreshPrices()` refuses (and the script exits 1) on weekdays from
  9:00am to 4:30pm Lagos time, read in Africa/Lagos, never the machine's
  zone (`trading-hours.ts`). Every refresh adds a price row, so a mid-day
  run would store intraday prices as a close.

## Where it runs

- Frontend: Vercel Hobby, root `frontend`. https://the-long-view-staging.vercel.app
- API: Render free, region ohio, from `render.yaml` (Node 22, built from the
  repo root). https://the-long-view-api.onrender.com - sleeps after 15 idle
  minutes; measured cold start about 46 s. Pages show skeletons meanwhile.
  `EDGE_PROXY_ENFORCE=true` there since 6 October: a direct call without
  the edge key gets 403, so call the API through the Vercel domain
  (`/api/...`); only `/health` (and `/health/live`) answer directly.
  Render's health check path is blank, so it only probes the port.
- Database: Neon, AWS us-east-2. Branches: `production` (currently holds
  development test data), `staging` (what the site uses now), `test` (e2e).
- Migrations are manual, against the direct URL: `$env:DIRECT_URL=...`,
  `npx prisma migrate deploy` (see docs/deployment.md).

**Launch plan (agreed: "Plan A")** - no separate live site. At launch this one
site becomes the real one: point it at a clean database, rename the Vercel
project so the shared link doesn't say "staging", then update Render's
FRONTEND_URL / CORS_ORIGIN / GOOGLE_CALLBACK_URL and Google's OAuth URIs.

## Next steps, in order

1. **Daily jobs + backup** (decided - ADR 009, runbook in
   docs/deployment.md). Live since 2 October 2026 in the private
   `the-long-view-backups` repo, against **staging** until go-live:
   `daily-market-jobs.yml` (weekdays `30 16 * * 1-5` UTC, `npm ci`,
   refresh then evaluation) and `nightly-backup.yml` (`pg_dump` 18,
   age-encrypted, 90-day artifacts). Both passed manual runs; the first
   backup was 43.6 KB (about 4 MB at 90 days of the 500 MB allowance), and
   a restore into an empty database matched its row counts. Remaining:
   - Stage 1 needs **a clean week** of jobs (defined in ADR 009, "When a
     day is missed"): five consecutive weekday refreshes that succeed,
     prices checked against NGX's closes on two of them. Monday 5 October
     failed (NGX's page changed; fixed by PR #42, ADR 012). A manual run
     on 6 October stored 146 prices, three matched another source, and
     the count starts with that evening's scheduled run.
   - Scheduled runs start hours late on this repo (market job 4h22m on
     2 October; backups 5-6h on 3-4 October, both passing); the trading-hours guard keeps a very late
     run from storing next-day intraday prices. If runs are dropped or
     keep slipping, trigger workflow_dispatch from cron-job.org instead.
2. **Pre-launch audit and launch gate** - started 5 October 2026, as a
   senior security analyst, timeboxed to a week as a target. The report is
   kept **outside this repo** until its findings are fixed: never put open
   findings in commits, PRs or docs here. Done: GitHub scanning on (CodeQL,
   Dependabot alerts, secret scanning), `master` ruleset (PR + all three CI
   jobs), error pages (PR #30), read-only CI token (PR #31), the three
   auth PRs (#33 citext + session revocation, #34/#35 Google account
   linking, #37 OAuth `state` + return path), G3 rate limiting + F-08
   security logging (#38, ADR 010; enforced and verified on staging 6
   October). Order from here (details in docs/backlog.md):
   1. G4 security headers, G5 edge caching for Ledger
      and Leaderboard, G2 uptime monitor on `/health/live` (it must call
      `/health` or `/health/live`: every other path needs the edge key),
      G6 a rehearsed rollback on Vercel and Render - in that order.
   2. **12 October:** one week after #38, check Vercel's proxy usage
      (docs/deployment.md, "The edge key", last paragraph).
   3. Remaining audit items: staging ramp (policies cited, abort
      conditions, tell Seyin before it starts), NDPA gap list, one-page
      SOC 2 checklist, performance audit.
   All High findings are fixed before stage 1 of the rollout.
3. **Go-live (Plan A).** Clean production database (seed, refresh prices),
   reset the Neon `neondb_owner` password and add least-privilege database
   roles, publish the Google consent screen, add Vercel Web Analytics, and
   switch the private jobs repo's two secrets to production. The uptime
   monitor (G2) keeps the API awake by design.
4. **Three-stage rollout:** Seyin and two friends, then a small group,
   then public; 7 days each for the first two, moving on only when the
   agreed exit criteria are met.

## Shelved updates (remind Seyin of all of these before the audit starts)

- `npm audit`: 38 left after the next/multer upgrade (0 critical, 37 high,
  1 moderate) - jest's braces/micromatch chain, eslint-config-next (same
  chain), brace-expansion, deepmerge-ts (Prisma config), mysql2 (Prisma
  CLI), fast-uri. 5 are in the production tree (the Prisma CLI comes in
  under `@prisma/client`; fast-uri via @hookform/resolvers), none reachable
  at runtime. npm's suggested fixes are major changes (jest 30) or
  downgrades (Prisma 6, eslint-config-next 14). Each was weighed in the
  audit (5 October 2026).
- `pg` warnings: sslmode aliasing (prefer/require become verify-full in pg 9)
  and "client.query() while already executing" in e2e.
- 7 lint warnings (`any`) in the backend.
- Google sign-in returning people to where they were (signed OAuth `state`
  + safeNextPath) - done in PR #37.
- The story/teaser sharing feature.
- One shared style for form fields (copy-pasted across six files).
- Keep the API awake, or accept the ~46 s cold start - decided: the uptime
  monitor (G2) keeps it awake.
- Go-live items: clean production database, Neon password reset, publish the
  Google consent screen, Vercel Web Analytics, switch the jobs repo's secrets.
- Scheduled jobs: a week of price checks against NGX closes; cron-job.org
  fallback if runs keep slipping (first runs were 4-6 h late).
- Trading-hours guard doesn't know NGX public holidays (harmless: a manual
  run on a weekday holiday just has to wait until 4:30pm).
- Back/forward cache: headless Chromium reloads rather than restores pages,
  so the Google button's reset is tested by firing `pageshow` directly.
- After launch: a list of updates worth doing once people give feedback.
