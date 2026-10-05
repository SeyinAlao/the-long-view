-- Case-insensitive email, and a per-user session version for revoking
-- every session at once (ADR 002).
--
-- One explicit transaction: Prisma 7 does not wrap a migration in one, so
-- without this a failure part-way would leave the earlier statements
-- applied. With it, a failure changes nothing; then run
-- `npx prisma migrate resolve --rolled-back <this folder's name>`, fix
-- the cause, and deploy again (docs/deployment.md).
--
-- Order: apply this BEFORE the code that reads "sessionVersion" deploys.
-- Old code keeps working on the migrated table, except that a mixed-case
-- email it looks up exactly can stop matching once lowercased below.
BEGIN;

-- Refuse, with a clear message, if two accounts' emails differ only by
-- letter case: lowercasing them, or the case-insensitive unique index,
-- would collide. Decide which account to keep first.
DO $$
DECLARE duplicates integer;
BEGIN
  SELECT count(*) INTO duplicates
  FROM (SELECT lower(email) FROM "User" GROUP BY lower(email) HAVING count(*) > 1) AS d;
  IF duplicates > 0 THEN
    RAISE EXCEPTION '% email address(es) belong to more than one account, differing only by letter case. Nothing was changed. See docs/deployment.md.', duplicates;
  END IF;
END $$;

-- Store every email lowercased, as the app now writes them. Needed as
-- well as citext: a lookup whose parameter arrives typed as text is
-- compared case-sensitively even against a citext column.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");

CREATE EXTENSION IF NOT EXISTS citext;
ALTER TABLE "User" ALTER COLUMN "email" TYPE CITEXT;

ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

COMMIT;
