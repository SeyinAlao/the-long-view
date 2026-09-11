# Contributing

This is currently a solo project built in public, following a real PR-based
workflow even without external contributors. See `the-long-view-updated-spec.md`
(kept privately alongside this repo) for the full product and engineering
specification, and `docs/decisions/` for why specific technical choices were
made.

## Workflow

1. Branch off `main`: `feature/…`, `fix/…`, `chore/…`, or `docs/…`.
2. Keep each branch to one coherent change.
3. Before opening a PR, run locally:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```
4. Open a PR describing what changed, why, and how it was tested.
5. CI must pass before merging. Squash or rebase, then delete the branch.

## Commit style

Conventional, descriptive commits:

```text
feat: add thesis creation flow
fix: prevent duplicate thesis evaluation
test: add thesis publishing tests
chore: configure eslint
docs: add local development setup
```

Not: `update`, `fix stuff`, `final2`.

## Code organization

- `frontend/` — Next.js App Router. Server Components fetch and pass data
  down; Client Components (marked `'use client'`) hold hooks, state, and
  interactivity. Don't mix the two in one file.
- `backend/` — NestJS modular monolith. One module per domain concern
  (see `docs/architecture.md` once it exists). No cross-module reach-around;
  go through a service's public methods.
- Data fetching on the frontend goes through TanStack Query hooks, not
  `useEffect` + `fetch`.
- Global UI state (not server state) goes through Zustand, kept small.
