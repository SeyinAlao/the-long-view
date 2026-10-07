-- Price.tradeDate and its unique index. Before migration 20261007120000:
-- no rows from either query. After: tradeDate is date, nullable, and
-- Price_securityId_tradeDate_key is a unique index on (securityId, tradeDate).
SET default_transaction_read_only = on;
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Price' AND column_name = 'tradeDate';
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'Price' AND indexname = 'Price_securityId_tradeDate_key';
