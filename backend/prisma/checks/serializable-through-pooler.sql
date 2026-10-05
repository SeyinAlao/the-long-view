-- For the POOLED url only: confirms a Serializable transaction runs
-- through Neon's PgBouncer (transaction mode), the way Prisma starts one
-- for Google account linking (BEGIN, then SET TRANSACTION ISOLATION
-- LEVEL SERIALIZABLE). Read-only by transaction, not by session: session
-- SETs are not supported through the pooler. Expect "serializable" and a
-- row count, then COMMIT.
BEGIN READ ONLY;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SHOW transaction_isolation;
SELECT count(*) AS users FROM "User";
COMMIT;
