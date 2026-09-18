# The Long View

A public conviction ledger for Nigerian equities. Publish an investment
thesis, not a hot take. It locks the moment it's published. Disagreement
happens by publishing a counter-thesis, not by commenting "bad take." When
the horizon ends, the market grades you — publicly, permanently.

## Why this exists

Prediction-based investing communities usually reward two things: being
loud, or being lucky. There's no equivalent to Blossom Social or Commonstock
for the Nigerian Exchange, and nothing anywhere rewards patient,
metrics-led analysis over short-term noise. The Long View makes conviction
accountable: every call is timestamped, immutable, and eventually checked
against reality.

## Core idea

```text
Publish → Lock → Debate → Measure
```

Research a security, publish a thesis with a real price target and time
horizon, and it locks immediately — no editing, no quiet deletes. Anyone
who disagrees has to publish their own locked counter-thesis. When the
horizon ends, the system evaluates the thesis against the actual price and
updates the author's public track record.

## Features

**Built:**
- Phase 0 — repository foundation, tooling, CI, base Next.js / NestJS /
  Prisma skeleton.
- Phase 1 — email/password registration and login, httpOnly-cookie JWT
  sessions, password hashing, protected-route guard (`GET /auth/me`).
  See `docs/decisions/002-cookie-based-jwt-auth.md` for why a cookie
  instead of a bearer token.

**Planned, in order (see Roadmap below):** securities and thesis
creation, publish-time immutability, the community layer (comments,
reactions, counter-thesis), market data, thesis evaluation and scoring,
leaderboards and notifications, and a final polish/production-readiness
pass. The frontend still needs real signup/login pages and `proxy.ts`
wired to the real session (currently a TODO stub) — that's the other
half of Phase 1, not yet done.

## Tech stack

**Frontend:** Next.js (App Router), TypeScript, React, Tailwind CSS,
TanStack Query for all server state, Zustand for client-only UI state,
Boxicons, React Hook Form + Zod for forms once they exist.

**Backend:** NestJS, TypeScript, Prisma, PostgreSQL — a modular monolith,
not microservices.

## Architecture

```text
Next.js (frontend)
       ↓
NestJS API (backend)
       ↓
PostgreSQL
```

The frontend and backend are separate deployables in one repository
(npm workspaces: `frontend/`, `backend/`), not a single merged app. Inside
the frontend, Server Components fetch and pass data down; Client Components
(`'use client'`) hold hooks, state, and interactivity — the two are kept
deliberately separate rather than mixed in one file. Inside the backend,
one NestJS module per domain concern (see spec section 24), all running in
one process.

## Thesis lifecycle

```text
DRAFT → ACTIVE → EVALUATED
```

## Scoring

Not implemented yet (Phase 6). The intended shape, so it's not a surprise
later:

```text
Outcome Score = performance component × conviction weight × sample-size confidence
```

A correct call at high conviction and a long horizon should outscore a
lucky short-term guess at low conviction. The exact formula will be
documented in `docs/scoring.md` once it's implemented, and it's designed
to be deterministic and hard to game, not maximally clever.

## Local development

```bash
git clone <repo-url>
cd the-long-view
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# fill in backend/.env with a real DATABASE_URL, then, in two terminals:
npm run dev:backend
npm run dev:frontend
```

The backend needs a running PostgreSQL instance matching `DATABASE_URL` in
`backend/.env`. `npm install` runs `prisma generate` automatically via
`postinstall` in `backend/`; run `npx prisma migrate dev` inside `backend/`
once a real schema migration exists.

**Why two env files instead of one at the root:** each workspace's dev
server and CLI commands (`next dev`, `nest start`, `prisma generate`) run
with their working directory set to that workspace's own folder, not the
repo root — so that's where each one looks for its `.env` file by
default. A single root-level `.env` would silently go unread by both.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list.
Nothing in either is a real secret — `JWT_SECRET` in particular must be
replaced with a long random value before this is ever deployed anywhere.

## Testing

```bash
npm run lint
npm run typecheck
npm run test
cd backend && npm run test:e2e && cd ..
npm run build
```

The e2e suite needs a real running Postgres matching `backend/.env` — it
creates and deletes real rows, so point it at a dev/test database, never
production.
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to
`main`: install, lint, typecheck, test (backend, against a real Postgres
service container), and build, for both `frontend/` and `backend/`
independently. A red check blocks merge in spirit even before branch
protection is turned on in the GitHub repo settings.

## Project status

```text
Current status: Phase 1 — backend auth done, frontend auth pages next
```

## Roadmap

```text
Phase 0  Repository foundation                 ← done
Phase 1  Authentication + protected routes      ← in progress (backend done)
Phase 2  Securities + thesis creation
Phase 3  Publishing + immutability
Phase 4  Community (comments, reactions, counter-thesis)
Phase 5  Market data
Phase 6  Evaluation + scoring
Phase 7  Leaderboard + notifications
Phase 8  Polish + production readiness
```

## Engineering decisions

- **Why a modular monolith, not microservices:** the product is small and
  needs clear module boundaries, not the operational overhead of running
  and coordinating separate services.
- **Why Next.js and NestJS as two apps, not one:** keeps frontend rendering
  concerns and backend business rules from bleeding into each other, while
  staying simple enough to run locally with two `npm run dev` commands.
- **Why PostgreSQL:** relational integrity matters here — a thesis, its
  metrics, its counter-theses, and its eventual outcome are all related
  records that need real foreign keys and transactions, not a document
  store's eventual consistency.
- **Why published theses are immutable:** it's the entire premise of the
  product. Enforced in the backend, not just hidden in the UI (see spec
  section 7) — this becomes one of the most heavily tested rules once
  Phase 3 lands.
- **Why market data is abstracted behind `MarketDataService`:** so Phase 5
  can start with seeded/manual data without blocking on a perfect NGX
  scraper, and a real provider can be swapped in later without touching
  anything else.
- **Why the first scoring system is intentionally simple:** a transparent,
  documented formula that's easy to explain beats an impressive-looking one
  that's hard to reproduce or defend.

More decisions are recorded as they're made in `docs/decisions/`.
