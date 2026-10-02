# The Long View

A public conviction ledger for Nigerian equities: publish a thesis on an NGX
stock, it locks, and it gets graded against real prices when its horizon ends.
Counter-theses are the only form of disagreement. Solo side project by Seyin,
built to be shown publicly. **Hard constraint: free tiers only, no spending.**

## Stack and layout

npm workspaces monorepo. Run installs from the repo root.

- `backend/` - NestJS 11, Prisma 7 (PrismaPg adapter), PostgreSQL on Neon
- `frontend/` - Next.js 16 App Router, React 19, TanStack Query, Zustand, Tailwind v4
- `docs/decisions/` - ADRs 001-008. Read the relevant one before changing that area.
- `docs/deployment.md` - runbook: hosts, every env var, setup order, migrations
- `docs/backlog.md` - agreed deferred work, split before / after launch

## Commands

Backend (`backend/`): `dev`, `lint`, `typecheck`, `test`, `test:e2e`, `build`,
`db:seed`, `market-data:refresh`, `evaluate:pending`.
Frontend (`frontend/`): `dev`, `lint`, `typecheck`, `build`.

Before any commit, run lint, typecheck, test and build for every side touched,
plus test:e2e for backend changes.

**e2e tests wipe their database.** A guard refuses to run unless the database
name contains `test`. `backend/.env` points at the **production** branch's
`neondb` (checked 2 October 2026; not staging, which the site uses), so e2e needs
the Neon test branch for that terminal session only:
`$env:DATABASE_URL="<test branch pooled URL>"`, run, then
`Remove-Item Env:\DATABASE_URL`. Never point e2e at staging or production.

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
   - Confirm a failed scheduled run emails Seyin.
   - For the first week, compare a few fetched prices with NGX's
     official closing prices to confirm 5:30pm catches the final ones.
   - Only start the market job by hand after 5:30pm Lagos: every refresh
     adds a price row, so a run during trading stores intraday prices.
2. **Browser tests PR.** Playwright in the repo and CI: the sign-up -> publish
   -> counter -> sign-out journey, two accounts on one tab (no leaked drafts),
   the Google button's loading state, an axe-core WCAG 2.2 AA audit across the
   main pages including error states, and the cold-start loading states (a
   relay that delays the API). Add `docs/backlog.md` items as they're done.
3. **Go-live (Plan A).** Clean production database (seed, refresh prices),
   reset the Neon `neondb_owner` password, publish the Google consent screen,
   add Vercel Web Analytics, switch the private jobs repo's two secrets to
   production, and decide whether to keep the API awake (Render free hours
   cover about one always-on service).

## Reminders for Seyin (raise only once the steps above are done)

- A full audit scan, a penetration-testing scan, and a review of how fast the
  app loads, with ways to optimise.
- A list of updates worth doing after he posts the project and hears feedback.
- After launch: Google sign-in returning people to where they were (signed
  OAuth `state` + safeNextPath), the story/teaser sharing feature, one shared
  style for form fields (copy-pasted across six files).
