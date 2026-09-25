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

## Status

Accepted.
