# Read-only database checks

Run with psql's `-f`, not `-c`: PowerShell strips the double quotes that
Postgres needs around table names like "User" when it passes a `-c`
string to psql. Every file switches its session to read-only first, so
none of them can change anything even if edited by mistake.

    & $psql $env:DIRECT_URL -f prisma\checks\<file>.sql

Use the **direct** URL (`$env:DIRECT_URL`): a session-level setting is
not supported through Neon's pooler. For a check through the pooled URL,
see `npm run db:check-pooler` (scripts/check-pooler-serializable.ts).

Used by the steps in docs/deployment.md.
