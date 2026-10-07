-- NGX's trading day on each price row, and the Terms version a person
-- accepted. Additive only: two nullable columns on "User", one nullable
-- column and one unique index on "Price". Nothing is backfilled or
-- deleted; old rows keep a null "tradeDate" (their day isn't known for
-- certain), and Postgres treats nulls as distinct, so they never clash
-- with the unique index.
--
-- Safe for the code already running: Prisma names the columns it reads,
-- so code from before this migration never sees the new ones, and its
-- price inserts leave "tradeDate" null. Apply this BEFORE merging the PR
-- that adds it to schema.prisma (docs/deployment.md).
--
-- One explicit transaction: Prisma 7 does not wrap a migration in one,
-- so a failure part-way changes nothing. Then run
-- `npx prisma migrate resolve --rolled-back <this folder's name>`.
BEGIN;

ALTER TABLE "Price" ADD COLUMN "tradeDate" DATE;

ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;

CREATE UNIQUE INDEX "Price_securityId_tradeDate_key" ON "Price"("securityId", "tradeDate");

COMMIT;
