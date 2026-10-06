# 009 — Scheduled jobs and backups run from a private repo

## Decision

The daily market-data refresh, the evaluation after it, and a nightly
database backup all run as GitHub Actions workflows in a separate
**private** repo, `the-long-view-backups`. Each run checks out this
repo's `master` and runs its scripts (`market-data:refresh`,
`evaluate:pending`). The in-process schedulers stay in the code for
local development only; Render runs with `DISABLE_SCHEDULED_JOBS=true`.

- **Refresh:** weekdays at 5:30pm Lagos (`30 16 * * 1-5` UTC; Lagos is
  UTC+1 with no daylight saving). NGX trades 9:00am-4:00pm since 27
  April 2026, and its public price list runs about 30 minutes behind.
  Actions schedules can start 5-30 minutes late, which only moves the
  run further past the close.
- **Evaluation:** straight after the refresh, in the same job. It still
  runs if the refresh fails, which is safe: a thesis is only graded on a
  price dated on or after its resolve date, so a stale price list just
  leaves it pending. A failed refresh still fails the run.
- **Backup:** nightly, `pg_dump -Fc` over the direct connection,
  encrypted with [age](https://age-encryption.org) to a public key, kept
  as a workflow artifact. The private key is held offline and never
  stored in either repo or in GitHub.

## Why

- **Private repo, not this one.** This repo is public. GitHub disables
  scheduled workflows in a public repo after 60 days without activity,
  which would silently stop prices, and with them publishing (ADR 004).
  It also keeps the database connection strings in one private place
  instead of this repo's secrets.
- **Encrypted, not just private.** A private repo is one leaked token
  away from public. An age-encrypted dump is useless without the
  offline key.
- **Fits the free tier.** About 100 Actions minutes a month of the 2,000
  included for private repos, and dumps far below the 500 MB artifact
  allowance. Retention is sized from the measured dump size, and the
  backup run fails, and so emails, if it would outgrow that allowance.
- Neon's free plan only restores to about 6 hours back, so it is not a
  backup on its own.

## Trade-off

Whatever is merged to `master` here runs with the database credentials.
CI and a single maintainer are the guard. Pinning the jobs to a commit
would be safer but needs a manual bump after every merge.

## When a day is missed

A weekday whose refresh fails, or never runs, has **no price rows**.
That can't be repaired later: NGX's public list shows only the current
day. What that means (`evaluation.service.ts`, `theses.service.ts`):

- **Grading.** A thesis is graded on the **first price recorded at or
  after** its resolve moment (published time + horizon). If its due day
  is missed, it is graded on the **next successful day's close** instead,
  and nothing records that it was a day late. If no later price exists
  yet, it stays pending and is retried on every run.
- **Publishing.** It needs the security's latest price to be at most 7
  days old (ADR 004). After 7 days with no successful refresh, every
  publish is refused (409). Example: the last success was Friday 2
  October at 20:53 UTC (Monday 5 October failed), so if nothing succeeds
  before then, publishing stops at about 20:53 UTC on Friday 9 October.
- **A manual run** (`workflow_dispatch`) after 4:30pm Lagos time on the
  same weekday recovers that day. Later than that, it records the next
  day's prices, or is refused during trading hours.

**A clean week** (the jobs' condition for rollout stage 1): five
consecutive weekday scheduled runs whose refresh succeeds with at least
100 securities updated, each starting before 08:00 UTC the next day; on
at least two of those days, three or more tickers match NGX's official
closing prices exactly; and every nightly backup in that week succeeds.
A failed or missing weekday starts the count again.

## Status

Accepted.
