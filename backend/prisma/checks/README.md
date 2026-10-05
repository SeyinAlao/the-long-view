# Read-only database checks

Run with psql's `-f`, not `-c`: PowerShell strips the double quotes that
Postgres needs around table names like "User" when it passes a `-c`
string to psql. Every file is read-only - by session, or for the pooler
check by transaction - so none can change anything even if edited by
mistake.

    & $psql $env:DIRECT_URL -f prisma\checks\<file>.sql

Use the **direct** URL (`$env:DIRECT_URL`) for every file except
`serializable-through-pooler.sql`: their session-level read-only setting
is not supported through Neon's pooler. That one file is for the pooled
URL and is read-only per transaction instead.

Used by the steps in docs/deployment.md.
