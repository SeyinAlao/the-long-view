# Deployment runbook

## Where everything runs

| Piece | Host | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel, Hobby plan | Root directory `frontend`. Browser calls go to `/api/...` and are forwarded to the API (ADR 007). |
| API (NestJS) | Render, free web service | Defined in `render.yaml`. Sleeps after 15 idle minutes; the first request after that takes about a minute. |
| Database | Neon | `production` branch for real data, `staging` for the staging deploy, `test` for e2e tests only. |
| Daily jobs and backups | GitHub Actions, in the private `the-long-view-backups` repo | Price refresh and evaluation on weekdays at 5:30pm Lagos, and a nightly encrypted backup (ADR 009). In-process schedulers are off on Render (`DISABLE_SCHEDULED_JOBS=true`). |

## Environment variables

### API (Render)

Set in the Render dashboard. `render.yaml` sets the non-secret ones.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) |
| `DIRECT_URL` | Neon **direct** connection string (no `-pooler`), used only by Prisma CLI commands |
| `JWT_SECRET` | A new random value per environment: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `FRONTEND_URL` | The frontend's URL, e.g. `https://<project>.vercel.app` |
| `CORS_ORIGIN` | Same as `FRONTEND_URL` |
| `GOOGLE_CALLBACK_URL` | `https://<project>.vercel.app/api/auth/google/callback` - on the **frontend's** domain |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From the Google Cloud OAuth client |

Changing `JWT_SECRET` signs everyone out. It never deletes data.

### Frontend (Vercel)

| Variable | Value |
|---|---|
| `BACKEND_URL` | The API's URL, e.g. `https://<service>.onrender.com`. Read at **build** time by the `/api` rewrite, so changing it needs a redeploy. |
| `API_TIMEOUT_MS` | **Leave unset.** How long a page waits for the API before showing the error page; default 90000 (90 s), which covers the ~46 s cold start and stays under Hobby's 300 s function limit. Only the browser tests set it, to 20000. |

### Google Cloud OAuth client

Each environment's callback must be listed under **Authorized redirect URIs**, exactly as set in `GOOGLE_CALLBACK_URL`. While the consent screen is in **Testing**, only listed test users can sign in; publish it before going live.

### Scheduled jobs (private repo's Actions secrets)

| Secret | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string of the database the site uses: **staging** until go-live, then production |
| `DIRECT_URL` | Direct connection string of the same branch, used by `pg_dump` |

The age **public** key is written in the backup workflow itself; it is not a secret. The private key is kept offline only. At go-live, switch both secrets to the production branch.

Failure emails for scheduled runs go to the GitHub user who created the workflow, or whoever last changed its `cron` line or re-enabled it, with email turned on under Settings, then Notifications, then Actions.

## Restoring a backup

The step-by-step PowerShell procedure, and `restore-check.sql` for the row counts, are in the private repo's README. Restoring was proven on 2 October 2026 (row counts matched the backup run's summary). The rules that matter:

- Decrypt only on your own machine, with the offline private key.
- Restore only into a **new, empty database**, never over a live branch. A new Neon branch's `neondb` is a copy of its parent's data, not empty: create a new database on the branch instead, and check `([uri]$env:RESTORE_URL).AbsolutePath` names it before running `pg_restore`.
- Use `pg_restore` 18 or newer, to match the server.
- Delete the decrypted `backup.dump` and the scratch branch afterwards.

## Database migrations

Migrations are a deliberate manual step, never automatic. Run them from your machine, against the target environment's **direct** URL, before deploying code that needs them:

```
cd backend
$env:DIRECT_URL="<that environment's direct connection string>"
npx prisma migrate deploy
Remove-Item Env:\DIRECT_URL
```

Never run `prisma migrate reset`, `prisma db push --force-reset` or the e2e tests against staging or production. The e2e tests refuse to run unless the database name contains `test`.

## Running the tests locally

The backend e2e tests and the browser tests both wipe their database, so they run against a **local** Postgres 18, not over the internet. CI is the authoritative run; this is for checking before you push.

**One-time setup** (Windows):

1. Install the server: `winget install PostgreSQL.PostgreSQL.18 --override "--mode unattended --superpassword <password> --serverport 5432 --enable-components server,commandlinetools"`, then make it listen on this machine only: `psql -U postgres -h localhost -c "ALTER SYSTEM SET listen_addresses = 'localhost'"` and `Restart-Service postgresql-x64-18`.
2. Create the database: `psql -U postgres -h localhost -c "CREATE DATABASE the_long_view_test"`.
3. Create `backend/.env.test.local` with one line, `DATABASE_URL=postgresql://postgres:<password>@localhost:5432/the_long_view_test`. It is gitignored (`.env*.local`); check `git status` doesn't list it.
4. Migrate and seed it once, from `backend/`, with both variables pointed at it (Prisma's config also reads `backend/.env`, which is a real database):
   `$env:DATABASE_URL="<that URL>"; $env:DIRECT_URL=$env:DATABASE_URL; npx prisma migrate deploy; npm run db:seed; Remove-Item Env:\DATABASE_URL, Env:\DIRECT_URL`
5. Install Playwright's browser: `cd e2e; npx playwright install chromium`.

**Running:**

- Backend e2e: `npm run test:e2e` in `backend/` (about 10 s). It reads `backend/.env.test.local`, in the guard and in every test worker, and turns the in-process scheduled jobs off.
- Browser tests: `npm run test:browser` from the repo root (about 1.5 min, most of it building). It migrates and seeds the test database, builds and starts the API, a relay and the frontend, and runs Playwright. For quick reruns without code changes, `$env:E2E_SKIP_BUILD="1"` reuses the last build. A failure leaves a trace in `e2e/test-results/`: `npx playwright show-trace <path>`.
- A `DATABASE_URL` already set in the shell wins over the file, so the Neon `test` branch still works as a fallback.

## Setting up an environment, in order

1. **Neon:** create the branch (schema only), then seed the companies: `$env:DATABASE_URL="<pooled URL>"; npx ts-node prisma/seed.ts`.
2. **Render:** New, then Blueprint, then this repo. Fill in the variables above. `FRONTEND_URL`, `CORS_ORIGIN` and `GOOGLE_CALLBACK_URL` can be placeholders until the frontend exists.
3. **Vercel:** import the repo, root directory `frontend`, set `BACKEND_URL` before the first deploy.
4. **Render:** replace the placeholders with the real frontend URL. Render redeploys.
5. **Google Cloud:** add the new callback URL.
6. **Verify** with the checklist below.

## Verification checklist

- [ ] `https://<api>/health` returns `"status":"ok"` with the database `up`.
- [ ] Register with email, save a draft, publish a thesis.
- [ ] From a second account, publish a counter-thesis.
- [ ] Sign out, wait at least 20 minutes so the API goes to sleep, then sign back in with Google: everything from before is still there, and the first page after the wait loads (slowly) rather than failing.
- [ ] `curl -sI https://<frontend>/api/leaderboard` shows `x-vercel-enable-rewrite-caching: 0`, or at least no `x-vercel-cache: HIT`.
