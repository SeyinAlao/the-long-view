-- The operator's takedown: "hiddenAt" and "hiddenReason" on "Thesis",
-- both nullable. Additive only: no default, no backfill, nothing deleted.
-- Empty means not hidden, which is every thesis today.
--
-- Safe for the code already running: Prisma names the columns it reads,
-- so code from before this migration never sees them. Apply this BEFORE
-- merging the PR that adds them to schema.prisma (docs/deployment.md,
-- "Thesis hidden columns").
--
-- One explicit transaction: Prisma 7 does not wrap a migration in one,
-- so a failure part-way changes nothing. Then run
-- `npx prisma migrate resolve --rolled-back <this folder's name>`.
BEGIN;

ALTER TABLE "Thesis" ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenReason" TEXT;

COMMIT;
