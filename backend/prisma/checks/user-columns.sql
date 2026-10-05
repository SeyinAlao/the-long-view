-- User.email's type and User.sessionVersion. After migration
-- 20261005120000: email is citext; sessionVersion is int4, default 0.
SET default_transaction_read_only = on;
SELECT column_name, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'User' AND column_name IN ('email', 'sessionVersion')
ORDER BY column_name;
