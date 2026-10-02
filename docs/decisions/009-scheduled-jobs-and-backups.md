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

## Status

Accepted.
