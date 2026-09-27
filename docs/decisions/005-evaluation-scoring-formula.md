# 005 — The evaluation scoring formula

## Decision

`outcomeScore = clamp(accuracyRatio, -1, 2) * conviction * sqrt(horizonDays / 30)`

Where `accuracyRatio = actualReturn / targetReturn` (0 if targetReturn
is 0 — a flat call has no direction to be right or wrong about).

## Why

This is the formula described from the very first framing of this
product: "conviction × horizon length × accuracy, rewarding patient
analysis over lucky short calls." Concretely:

- **Direction matters more than magnitude.** Getting the direction
  right and capturing most of the move scores well; getting the
  direction wrong scores negatively, regardless of how confident the
  call was — in fact, a wrong call made with high conviction is
  penalized *more* than a wrong call made with low conviction, which
  is the correct incentive.
- **Clamped, not unbounded.** A call that overshoots its target by 10x
  shouldn't dominate every other score on the platform, and a
  catastrophically wrong call shouldn't be infinitely punishing either.
  -1 to 2 keeps outliers from swamping the system while still rewarding
  (and punishing) real outperformance and underperformance.
- **sqrt, not linear, for horizon.** A 2-year call deserves more credit
  for patience than a 1-month one, but linear scaling would let horizon
  length alone dominate the score almost regardless of accuracy — sqrt
  gives real weight to patience without making it the only thing that
  matters.

## Trade-off accepted

This is a first-cut formula, not a definitively "correct" one — there's
no single objectively right way to combine these three factors, and the
specific clamp bounds and the sqrt weighting are genuine, tunable
choices. If real usage shows it rewards or punishes the wrong things in
practice, this is the place to revisit, with real outcome data to learn
from rather than guessing again from scratch.

## Status

Accepted.
