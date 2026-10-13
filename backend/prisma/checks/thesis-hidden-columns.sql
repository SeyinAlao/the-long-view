-- Thesis.hiddenAt and Thesis.hiddenReason. Before migration
-- 20261007180000: (0 rows). After: hiddenAt timestamp and hiddenReason
-- text, both nullable with no default.
SET default_transaction_read_only = on;
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Thesis' AND column_name IN ('hiddenAt', 'hiddenReason')
ORDER BY column_name;
