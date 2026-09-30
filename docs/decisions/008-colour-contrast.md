# 008 — Colour contrast and keyboard focus

## Decision

Every colour used for text, or as a fill behind text, meets WCAG 2.2 AA
against the cream background: at least 4.5:1. Focus outlines and other
meaningful non-text marks meet 3:1. The ratios live next to each token
in `frontend/app/globals.css`, so the next person changing a colour sees
the rule where they make the change.

| Token | Value | On cream | Use |
|---|---|---|---|
| `ink` | #211d17 | 15.95:1 | body text |
| `muted` | #6b6459 | 5.52:1 | secondary text |
| `brass-dark` | #876a2d | 4.64:1 | brass-coloured text |
| `terracotta-dark` | #ad5524 | 4.67:1 | terracotta text, fills behind text |
| `focus` | #a38645 | 3.16:1 | keyboard focus outline |
| `brass` | #c8a455 | 2.15:1 | decoration only (slider fill, borders) |
| `terracotta` | #c8622a | 3.66:1 | decoration only (hairline borders) |

Each new or changed value is the smallest darkening of the original that
passes, so the palette keeps its character. `brass-dark` moved by an
amount you can't see; it was 4.44:1, just short.

Keyboard focus is one rule in the base layer - a 2px `focus` outline on
every interactive element's `:focus-visible` - not per-component styles.
Components must not remove it: `outline-none` on a field was what left
six fields with no focus indicator at all.

## Why

An automated audit (axe-core, WCAG 2.2 AA rules) across nine pages,
including their error states, found 13 failures: error messages,
wrong-direction verdicts, negative leaderboard scores and section labels
below 4.5:1, and one 16px icon button below the 24px minimum target
size. A separate keyboard check found six form fields - including the
sign-in email and password and the conviction slider - with no visible
focus indicator, because each had switched the browser's own off.

## Trade-offs accepted

- Two terracotta tokens instead of one. The original stays for
  decoration, where it reads better; `-dark` is for anything that has to
  be read.
- The focus outline is brass-family (3.16:1) rather than ink (15.95:1)
  to stay on-brand; it clears the 3:1 bar, not by a wide margin.

## Status

Accepted.
