# Read-only database checks

Run with psql's `-f`, not `-c`: PowerShell strips the double quotes that
Postgres needs around table names like "User" when it passes a `-c`
string to psql. Every file switches its session to read-only first, so
none of them can change anything even if edited by mistake.

    & $psql $env:DIRECT_URL -f prisma\checks\<file>.sql

Used by the migration steps in docs/deployment.md.
