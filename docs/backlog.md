# Backlog

Agreed work that is deliberately not done yet, and when it should be.

## Before going live, in order

Agreed 5 October 2026 during the pre-launch audit. Each step is its own PR, merged only when CI is green.

1. **Done 5 October:** friendly error pages (PR #30) and a read-only CI token (PR #31) merged; the code-scanning alerts they addressed closed on `master`. The three auth PRs merged: case-insensitive emails and session revocation (#33), Google account linking (#34, #35), Google sign-in `state` and the return path (#37).
2. **Done 6 October: rate limiting** (G3) and security logging (audit item F-08), PR #38, ADR 010. Merged 5 October; `EDGE_PROXY_ENFORCE=true` on Render since 6 October, verified on staging (direct calls get 403, `/health` 200, `auth_login_failed` logged with a real `ipRef`). Direct API calls now need the edge key, so they go through the Vercel domain; only `/health` and `/health/live` answer directly. **12 October:** check Vercel's proxy usage, one week after the merge (docs/deployment.md, "The edge key"). Later, optionally: one Vercel firewall rate-limit rule as an outer layer (Hobby allows one).
3. **Security headers** (G4): API and frontend.
4. **Edge caching for the Ledger and Leaderboard** (G5). The build must not depend on the API being awake.
5. **Uptime monitor** (G2) on a new `/health/live` route with no database call, so Neon can scale down. It must call `/health` or `/health/live`: with the edge key enforced, any other direct path gets 403 and would read as down. Keeps the API awake by design; check the monitor's timeout against the ~46 s cold start and Neon's current free compute allowance first.
6. **One rehearsed rollback** (G6) on Vercel and Render, steps verified in each platform's docs.
7. **Remaining audit items:** a small, policy-checked ramp on staging (with abort conditions, announced before it starts), the NDPA gap list, a one-page SOC 2 checklist, the performance audit, and any remaining findings.
8. **Go-live items** (below).
9. **Three-stage rollout:** Seyin and two friends, then a small group, then public. Each stage moves on only when its agreed exit criteria are met; stages 1 and 2 run 7 days each.

### Go-live items

- **Reset the Neon `neondb_owner` password** and update every environment's connection strings. The current one was shared outside the project during setup. At the same time, give the API and the jobs their own least-privilege database roles.
- **Publish the Google OAuth consent screen**, so any Google account can sign in, not only listed test users.
- **Daily jobs and nightly backup on GitHub Actions** (scheduled runs confirmed: they start 4-6 hours late, which is harmless), in the private `the-long-view-backups` repo (ADR 009). Since publishing requires a real price from the last 7 days, the refresh job is what keeps publishing possible at all, and Neon's free plan only restores to about 6 hours back. The in-process schedulers already run at the new times (5:30pm / 6:00pm Lagos). The workflows are live, a test restore passed and a failed scheduled run emailed (2 October 2026). Still to do: a week of checking fetched prices against NGX's official closes, and switching both secrets to production.
- **A clean production database.** The current `production` branch holds development test data, including theses published with the ₦100 placeholder price. Real users should start on clean data.
- **Vercel Web Analytics** on the production site (free up to 50,000 events a month on Hobby; not on staging, where the only visitor is the developer).

## After going live

- **Email verification at password sign-up.**
- **Share a thought, story-style, linking to the full thesis**, with the full thesis behind sign-in.
- **One shared style for form fields.** The same class string is copy-pasted across six files.
- **One shared "page is ready" wait in the browser tests.** Several tests type into a field straight after `page.goto`, and a key pressed before React hydrates the page is dropped. The account-switch test hit this in October 2026 and now retypes until the form responds (its own workaround). Replace per-test workarounds with one helper that waits for hydration (for example a marker the root layout sets once mounted), and use it in every test that types after loading a page.

## Known and accepted

- **A missing thesis returns HTTP 200, not 404.** `/theses/[id]` has a `loading.tsx`, so the response starts streaming before the thesis is looked up, and the status can't change after that (Next.js docs: loading.js, "Status codes"). The not-found page still shows, and Next.js marks it `noindex`, so search engines don't index it; a browser test checks both. A real 404 would mean checking the thesis exists in `proxy.ts` before rendering - not worth the extra API call per visit for now.
