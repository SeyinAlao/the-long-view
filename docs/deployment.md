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

Two things to know before any migration (both checked on 5 October 2026 with Prisma 7.10):

- **Always set `DIRECT_URL` first.** `prisma.config.ts` loads `backend/.env`, which points at the **production** branch. dotenv never overrides a variable that is already set, so setting `DIRECT_URL` in the shell is what keeps a command on the database you meant.
- **Prisma does not wrap a migration in a transaction.** If one fails part-way, the statements before the failure stay applied and the migration is left unfinished, which blocks every later deploy. Write multi-statement migrations inside `BEGIN; ... COMMIT;`, so a failure changes nothing. After any failure: `npx prisma migrate resolve --rolled-back <migration folder name>`, fix the cause, deploy again.

### Case-insensitive email and session version (`20261005120000_...`)

**Apply this before the code that needs it merges**: the new code reads `sessionVersion`, so it fails against a database without it. Old code keeps working on the migrated database with one exception: the migration lowercases stored emails, and old code looks emails up exactly, so someone whose stored email had capitals can't sign in until the new code deploys, minutes later. Fine on staging; production starts clean.

If the target's migration ledger is empty (staging's is: see "Baselining" below), baseline it first; the steps below include that. From `backend/`, in PowerShell, with this change checked out (before merge: `git switch fix/auth-email-sessions`). Every psql check is a file in `prisma/checks/`, run with `-f` (PowerShell strips the quotes table names need from `-c`), and each sets its session read-only.

What staging needs, found with the read-only diff on 5 October 2026: its schema matches the first **three** migrations exactly; migration 4 (`20260927160000_counter_thesis_unique`, one unique index on `CounterThesis("thesisId", "authorId")`) was never applied. So: record three as applied, and let `migrate deploy` run migrations 4 and 5.

1. **Host check.** Load the target's **direct** URL into this window only, and check where it points before anything else:
   ```
   $env:DIRECT_URL = "<the target's direct connection string>"
   $psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
   $u = [uri]$env:DIRECT_URL; "$($u.Host)  $($u.AbsolutePath)"
   ```
   For staging it must print a host starting `ep-bold-sky-a5oday2y.`, with no `-pooler`, and `/neondb`. Anything else: stop.
2. **Read-only status and ledger:**
   ```
   npx prisma migrate status
   & $psql $env:DIRECT_URL -f prisma\checks\migration-ledger.sql
   ```
   If the ledger lists the first four, skip to step 6. If it is empty (status lists all five), continue.
3. **Read-only diffs.** `migrate diff` only reads the target; it replays migrations into a throwaway **local** shadow database, which Prisma wipes (prisma.config.ts refuses one without "shadow" in its name):
   ```
   & $psql "postgresql://postgres:<local password>@localhost:5432/postgres" -c "CREATE DATABASE the_long_view_shadow"   # "already exists" is fine
   $env:SHADOW_DATABASE_URL = "postgresql://postgres:<local password>@localhost:5432/the_long_view_shadow"
   $four = Join-Path $env:TEMP "tlv-first-four"; $three = Join-Path $env:TEMP "tlv-first-three"
   Remove-Item $four, $three -Recurse -Force -ErrorAction SilentlyContinue
   Copy-Item prisma\migrations $four -Recurse
   Remove-Item (Join-Path $four "20261005120000_case_insensitive_email_session_version") -Recurse
   Copy-Item $four $three -Recurse
   Remove-Item (Join-Path $three "20260927160000_counter_thesis_unique") -Recurse

   # a) Against the first four, as SQL: what the target lacks
   npx prisma migrate diff --from-config-datasource --to-migrations $four --script --exit-code
   "exit code: $LASTEXITCODE"
   Get-Content prisma\migrations\20260927160000_counter_thesis_unique\migration.sql

   # b) Against the first three: must match exactly
   npx prisma migrate diff --from-config-datasource --to-migrations $three --exit-code
   "exit code: $LASTEXITCODE"

   Remove-Item Env:\SHADOW_DATABASE_URL
   ```
   a) must print `exit code: 2` and exactly one statement, `CREATE UNIQUE INDEX "CounterThesis_thesisId_authorId_key" ON "public"."CounterThesis"("thesisId" ASC, "authorId" ASC);` - the same index as migration 4's file (Prisma adds the schema name and `ASC`, both defaults). b) must print `No difference detected.` and `exit code: 0`. Anything else: stop, and keep the output (structure only, no data).
4. **Snapshot:** in the Neon console, create a branch from the target (for example `staging-before-auth-1` from `staging`). Free and instant; it is the way back. Every step from here writes.
5. **Baselining, record the first three as applied.** This only writes rows to `_prisma_migrations`; it runs none of their SQL:
   ```
   foreach ($m in "20260911014512_init", "20260918103000_add_google_oauth", "20260925160000_nullable_reference_price") { npx prisma migrate resolve --applied $m }
   npx prisma migrate status
   ```
   Status must now list exactly `20260927160000_counter_thesis_unique` and `20261005120000_case_insensitive_email_session_version` as not yet applied.
6. **Read-only duplicate checks.** Both must print `(0 rows)`:
   ```
   & $psql $env:DIRECT_URL -f prisma\checks\duplicate-counter-theses.sql
   & $psql $env:DIRECT_URL -f prisma\checks\duplicate-emails.sql
   ```
   Rows from the first: an author has more than one counter-thesis on one thesis, and migration 4's unique index would fail. Rows from the second: emails differing only by case, and migration 5 refuses. Either way, stop and decide what to keep first.
7. **Apply:** `npx prisma migrate deploy` (applies migrations 4 and 5, in order).
8. **Verify:**
   ```
   npx prisma migrate status
   & $psql $env:DIRECT_URL -f prisma\checks\migration-ledger.sql
   & $psql $env:DIRECT_URL -f prisma\checks\counter-thesis-indexes.sql
   & $psql $env:DIRECT_URL -f prisma\checks\user-columns.sql
   ```
   Status says up to date; the ledger lists five, all with `finished_at`; the indexes include `CounterThesis_thesisId_authorId_key`; `email` is `citext` and `sessionVersion` is `int4`, default `0`.
9. **If step 7 failed,** the ledger shows which migration has no `finished_at` (`migrate status` doesn't say clearly). Nothing of that migration was applied (4 is one statement; 5 runs in a transaction), but anything before it was. Run `npx prisma migrate resolve --rolled-back <that migration's folder name>`, fix the cause, and go back to step 6.
10. `Remove-Item Env:\DIRECT_URL`. Then merge the code. When the API redeploys, every existing session ends (tokens issued before this carry no session version), so everyone signs in once.

Rehearsed on 5 October 2026 against a local database built the way staging is (the first four migrations' tables, with that index dropped, some rows, an empty `_prisma_migrations`): status listed all five; diff (a) printed exactly that index with exit code 2, and (b) no difference; the three were recorded; both duplicate checks returned 0 rows; deploy applied 4 then 5; the ledger ended with five finished rows. The failure path was rehearsed too: with a duplicate counter-thesis, migration 4 failed on the index, `resolve --rolled-back` plus removing the duplicate let the next deploy apply 4 and 5. The read-only session setting in the check files was confirmed to refuse a `DELETE`.

**Production (read-only check, 5 October 2026):** its ledger records the first three migrations, all finished, and it has the same missing index (0 duplicate pairs). It needs no baselining: `migrate deploy` would apply 4 and 5. It is to be replaced by a clean database at go-live anyway.

### Baselining: tables exist but the migration ledger is empty

`prisma migrate status` listing **every** migration as not yet applied, on a database whose tables exist, means `_prisma_migrations` is empty. A Neon **schema-only branch** does this: it copies every table's structure and no rows, the ledger included (Neon docs: "Schema-only branches"). That is how `staging` was created. Never run `migrate deploy` on such a database before baselining: it would try to create tables that already exist.

Baselining tells Prisma which migrations the schema already reflects: read-only `migrate diff`s find exactly which ones that is (step 3 above - for staging, the first three, not four), then `migrate resolve --applied <name>` once per migration (step 5). Never record a migration as applied without a diff showing the schema already has it. See Prisma's "Baselining a database" guide.

### Creating a clean database (go-live)

Don't use a schema-only branch for the clean production database: it starts with the same empty ledger. Instead:

1. In the Neon console, create a new, **empty** database, and take its direct and pooled URLs. (A normal Neon branch copies its parent's data; a schema-only one copies an empty ledger. Neither is what this needs.)
2. Host check as in step 1 above, then `npx prisma migrate deploy`. On an empty database this runs every migration in order and fills the ledger, so later migrations apply normally.
3. `npx prisma migrate status` says up to date. Then, with `$env:DATABASE_URL` set to the new database's **pooled** URL (both scripts read it, and `backend/.env` would otherwise supply the old one): `npm run db:seed`, and `npm run market-data:refresh` (it refuses on weekdays from 9:00am to 4:30pm Lagos time).

If a schema-only branch is used anyway, baseline it with steps 1-5 above, listing **all** migrations that exist at that point.

## Google account linking through Neon's pooler (staging trial)

Linking a Google sign-in to an existing account runs a **Serializable** transaction (ADR 003). The tests use a direct local database; the live API uses Neon's **pooled** URL. Neon's pooler is PgBouncer in transaction mode, which holds one server connection from `BEGIN` to `COMMIT`; its documented limits are session-level (`SET`/`RESET`, `LISTEN`, SQL `PREPARE`, session advisory locks). Prisma's pg adapter (7.10) starts the transaction with `BEGIN`, then `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`, which is transaction-scoped. So it should work; this confirms it on staging, harmlessly:

1. **Read-only check, through Prisma** (the same client and adapter the API uses), with staging's **pooled** URL. From `backend/`:
   ```
   $env:POOLED_URL = "<staging pooled connection string>"
   npm run db:check-pooler
   Remove-Item Env:\POOLED_URL
   ```
   It opens one Serializable transaction, makes it read-only, reads one user's id (it prints only whether a row came back) and ends it; it writes nothing. It doesn't load `backend/.env`, refuses a host without `-pooler`, and never prints the connection string. Expect:
   ```
   Host: ep-...-pooler.us-east-2.aws.neon.tech  Database: /neondb
   Isolation: serializable  Read-only: on
   Read one row: yes
   OK: a Serializable transaction works through this connection.
   ```
   Check the host is staging's (`ep-bold-sky-a5oday2y-pooler...`). Anything starting `FAILED:` means it doesn't work through the pooler: don't rely on linking until that's understood.
2. **One real link, after the API deploys:** register a throwaway account with a password, using an email of a Google account you control and no published work; sign out; choose "Continue with Google" with that account. Expect the dashboard notice, and that the password no longer signs in. Render's logs show no `google_sign_in_failed`. Delete nothing: the account is staging test data.

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

1. **Neon:** create a new, **empty** database for the environment (not a schema-only branch: that copies an empty migration ledger; see "Baselining"). Build it with `npx prisma migrate deploy` (host check first), then seed the companies: `$env:DATABASE_URL="<pooled URL>"; npx ts-node prisma/seed.ts`.
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
