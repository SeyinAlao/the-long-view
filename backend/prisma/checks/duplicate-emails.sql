-- Emails that differ only by letter case. Must return 0 rows before the
-- case-insensitive email migration (it refuses otherwise).
SET default_transaction_read_only = on;
SELECT lower(email) AS email, count(*) AS accounts
FROM "User"
GROUP BY lower(email)
HAVING count(*) > 1;
