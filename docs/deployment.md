# Deployment runbook

## Where everything runs

| Piece | Host | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel, Hobby plan | Root directory `frontend`. Browser calls go to `/api/...` and are forwarded to the API (ADR 007). |
| API (NestJS) | Render, free web service | Defined in `render.yaml`. Sleeps after 15 idle minutes; the first request after that takes about a minute. |
| Database | Neon | `production` branch for real data, `staging` for the staging deploy, `test` for e2e tests only. |
| Daily jobs | GitHub Actions | Market-data refresh and evaluation. In-process schedulers are off on Render (`DISABLE_SCHEDULED_JOBS=true`). |

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

### Google Cloud OAuth client

Each environment's callback must be listed under **Authorized redirect URIs**, exactly as set in `GOOGLE_CALLBACK_URL`. While the consent screen is in **Testing**, only listed test users can sign in; publish it before going live.

## Database migrations

Migrations are a deliberate manual step, never automatic. Run them from your machine, against the target environment's **direct** URL, before deploying code that needs them:

```
cd backend
$env:DIRECT_URL="<that environment's direct connection string>"
npx prisma migrate deploy
Remove-Item Env:\DIRECT_URL
```

Never run `prisma migrate reset`, `prisma db push --force-reset` or the e2e tests against staging or production. The e2e tests refuse to run unless the database name contains `test`.

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
