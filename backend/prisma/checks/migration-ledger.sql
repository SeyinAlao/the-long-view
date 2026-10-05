-- What Prisma has recorded as applied (empty on a schema-only branch).
SET default_transaction_read_only = on;
SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;
