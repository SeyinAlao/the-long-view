# 006 — How the leaderboard ranks authors

## Decision

Authors are ranked by **cumulative outcome score** — the sum of the
`outcomeScore` of every thesis they have had evaluated. Ties break on
more evaluated calls, then alphabetically by username. Each row also
shows evaluated count, average score, and hit rate (how often the call
went the direction it said it would).

## Why cumulative, not average

- **Average with a minimum-sample threshold** is the usual answer, but
  on a young platform it means an empty leaderboard for a long time:
  nobody has three resolved calls yet, and a thesis only resolves once
  its horizon passes — months, by design.
- **Average with no threshold** lets one lucky call outrank a long,
  consistent record.
- **Cumulative** rewards a sustained record and needs no arbitrary
  threshold. The obvious objection — spam lots of calls to climb — is
  answered by the score itself: a wrong call scores *negative*, and
  more heavily the more conviction was staked, so volume without skill
  drifts toward zero or below rather than upward.

## Trade-offs accepted

- Someone with many mediocre-but-positive calls can outrank someone
  with a few excellent ones. Average score and hit rate are shown
  alongside so a reader can see the difference.
- The board only counts **evaluated** theses. A thesis still inside its
  horizon appears nowhere here, which is correct — nothing has been
  graded yet — but means the board is empty until the first real call
  resolves.
- Capped at 50 entries. Fine now; pagination is the right answer if it
  ever isn't.

## Status

Accepted. A first cut, like the scoring formula in 005 it builds on —
revisit with real outcome data rather than guessing again.
