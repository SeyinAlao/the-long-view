-- One author with more than one counter-thesis on the same thesis. Must
-- return 0 rows before migration 20260927160000_counter_thesis_unique:
-- creating its unique index fails if any exist.
SET default_transaction_read_only = on;
SELECT "thesisId", "authorId", count(*) AS counter_theses
FROM "CounterThesis"
GROUP BY "thesisId", "authorId"
HAVING count(*) > 1;
