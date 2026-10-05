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
- `docs/decisions/` - ADRs 001-009. Read the relevant one before changing that area.
- `docs/deployment.md` - runbook: hosts, every env var, setup order, migrations
- `docs/backlog.md` - agreed deferred work, split before / after launch

## Commands

Backend (`backend/`): `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `build`,
`db:seed`, `market-data:refresh`, `evaluate:pending`.
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
- Signing in or out clears the TanStack Query cache and the unsaved-draft
  autosave (account switching on a shared browser).
- In-process cron jobs are off when `DISABLE_SCHEDULED_JOBS=true` (Render).
- NGX trading hours are 9:00am-4:00pm WAT since 27 April 2026. Don't assume
  the old 2:30pm close anywhere.
- `refreshPrices()` refuses (and the script exits 1) on weekdays from
  9:00am to 4:30pm Lagos time, read in Africa/Lagos, never the machine's
  zone (`trading-hours.ts`). Every refresh adds a price row, so a mid-day
  run would store intraday prices as a close.

## Where it runs

- Frontend: Vercel Hobby, root `frontend`. https://the-long-view-staging.vercel.app
- API: Render free, region ohio, from `render.yaml` (Node 22, built from the
  repo root). https://the-long-view-api.onrender.com - sleeps after 15 idle
  minutes; measured cold start about 46 s. Pages show skeletons meanwhile.
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
   - For the first week, compare a few fetched prices with NGX's
     official closing prices to confirm 5:30pm catches the final ones.
   - Scheduled runs start hours late on this repo (market job 4h22m on
     2 October; backups 5-6h on 3-4 October, both passing); the trading-hours guard keeps a very late
     run from storing next-day intraday prices. If runs are dropped or
     keep slipping, trigger workflow_dispatch from cron-job.org instead.
2. **Pre-launch audit**, in the role of a senior security analyst. Before
   starting, remind Seyin of every shelved update (list below). Then:
   - SOC 2 readiness review (Trust Services Criteria gap list - not a
     certification, which needs an auditor).
   - NDPA 2023 (Nigeria Data Protection Act) privacy review: what personal
     data is held, lawful basis, privacy notice, retention, deletion, breach
     handling, cross-border transfer (hosts are in the US).
   - OWASP-based security audit (ASVS / Top 10) of the code and config.
   - GitHub's free scanning: CodeQL, Dependabot alerts, secret scanning.
   - Self pen test - first read Vercel's, Render's and Neon's testing
     policies and stay inside them.
   - Security headers (CSP, HSTS, frame-ancestors, referrer, permissions).
   - Performance audit (Core Web Vitals, bundle size, cold start).
   - Then fix what it finds, each with a test.
3. **Go-live (Plan A).** Clean production database (seed, refresh prices),
   reset the Neon `neondb_owner` password, publish the Google consent screen,
   add Vercel Web Analytics, switch the private jobs repo's two secrets to
   production, and decide whether to keep the API awake (Render free hours
   cover about one always-on service).

## Shelved updates (remind Seyin of all of these before the audit starts)

- Upgrade `next` past 16.3.5 (critical advisory in `next/og` ImageResponse)
  and `multer` (via @nestjs/platform-express). Neither path is used today
  (checked 5 October 2026), but both have fixes.
- `pg` warnings: sslmode aliasing (prefer/require become verify-full in pg 9)
  and "client.query() while already executing" in e2e.
- 7 lint warnings (`any`) in the backend.
- Google sign-in returning people to where they were (signed OAuth `state`
  + safeNextPath).
- The story/teaser sharing feature.
- One shared style for form fields (copy-pasted across six files).
- Keep the API awake, or accept the ~46 s cold start.
- Go-live items: clean production database, Neon password reset, publish the
  Google consent screen, Vercel Web Analytics, switch the jobs repo's secrets.
- Scheduled jobs: a week of price checks against NGX closes; cron-job.org
  fallback if runs keep slipping (first runs were 4-6 h late).
- Trading-hours guard doesn't know NGX public holidays (harmless: a manual
  run on a weekday holiday just has to wait until 4:30pm).
- Back/forward cache: headless Chromium reloads rather than restores pages,
  so the Google button's reset is tested by firing `pageshow` directly.
- After launch: a list of updates worth doing once people give feedback.
