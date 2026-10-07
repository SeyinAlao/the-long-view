-- User.termsVersion and User.termsAcceptedAt. Before migration
-- 20261007120000: no rows. After: termsAcceptedAt timestamp, termsVersion
-- text, both nullable with no default.
SET default_transaction_read_only = on;
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'User' AND column_name IN ('termsVersion', 'termsAcceptedAt')
ORDER BY column_name;
