-- Hidden theses: ids, tickers, when and why only (never the text or the
-- author's details). Only after migration 20261007180000. Right after
-- it: (0 rows).
SET default_transaction_read_only = on;
SELECT t.id, s.ticker, t.status, t."hiddenAt", t."hiddenReason"
FROM "Thesis" t JOIN "Security" s ON s.id = t."securityId"
WHERE t."hiddenAt" IS NOT NULL
ORDER BY t."hiddenAt";
