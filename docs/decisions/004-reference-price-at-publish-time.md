# 004 — Reference price is captured at publish time, not draft time

## Decision

`Thesis.referencePrice` is null while a thesis is a draft. It's set
exactly once, automatically, from the security's live `currentPrice`
at the moment `POST /theses/:id/publish` runs — never supplied by the
user, and never editable afterward.

## Why

The product's entire premise is that a call gets graded against reality.
If the author could set their own reference price, they could quietly
pick a favorable starting point days after actually deciding on the
call, making every subsequent "+14% since publication" number
meaningless. Deriving it from the security record at the exact moment
of locking removes that entire failure mode — there's no field to fudge
because there's no field to fill in.

## Amendment: only a real, recent price can be locked in

The original decision read `Security.currentPrice`. That field can't be
trusted on its own: the seed fills every company with a ₦100.00
placeholder, and it stays that way until the daily price job runs. On
the staging deploy, before any price job existed there, a thesis was
published with a reference price of ₦100 - a number that never existed,
locked in permanently.

The reference price now comes from the most recent row in the `Price`
history, which only the price job ever writes. Publishing is refused,
with a 409 and a plain explanation, when there is no such row, or when
the newest one is more than 7 days old. The draft is left untouched.

Seven days covers weekends and NGX's longest public-holiday closures,
while still noticing within a week if the price job has stopped. A
suspended stock, which has no fresh price, can't be published on -
which is also correct: there's no live price to be graded against.

## Status

Accepted, amended.
