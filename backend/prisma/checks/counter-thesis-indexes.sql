-- The indexes on CounterThesis. After migration 20260927160000 there is
-- one named "CounterThesis_thesisId_authorId_key".
SET default_transaction_read_only = on;
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'CounterThesis' ORDER BY indexname;
