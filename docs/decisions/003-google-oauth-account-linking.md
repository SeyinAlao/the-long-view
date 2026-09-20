# 003 — Google sign-in links to existing accounts by email

## Decision

When someone signs in with Google, the lookup order is: match by Google
id first (returning user), then match by email (an existing
password-based account with the same email gets the Google id linked
onto it), then create a new account only if neither matches.

## Why

Without the email-matching step, someone who registered with a password
using seyin@example.com and later clicks "Continue with Google" on that
same email would silently get a second, disconnected account — split
track record, split everything, and a confusing "why don't I see my old
theses" moment. Matching on email first prevents that split.

## Trade-off accepted

This trusts that Google has verified the email address behind the
account it hands back — which it has, Google requires verified emails
for this OAuth scope. If a future auth provider is added that doesn't
guarantee verified emails, this exact linking logic would need a second
look before reusing it as-is.

## Status

Accepted.
