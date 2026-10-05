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

## Amendment, October 2026: what proves the email

Google proves that the person signing in controls the email address. A
password set at sign-up proves nothing about the address, because
sign-up doesn't verify it. So when the two meet, the Google sign-in is
the stronger claim, and linking now goes through `GoogleLinkService`, in
one Serializable transaction:

- **A different Google id already on the account:** refused and logged,
  never silently relinked (that used to cut the first Google account out).
- **A password account with public activity** (a published thesis or any
  counter-thesis; `PublicActivityService` is the one place that decides,
  so comments and reactions extend it later): refused and logged. That
  work can't be handed to whoever proves the email afterwards. The person
  is told to sign in with their email and password.
- **Otherwise:** the Google id is linked, the password removed (it proved
  nothing; Google just did) and every session ended (`sessionVersion`).
  Drafts stay. The dashboard says Google is now the way to sign in.

Serializable, because the activity check and the update must be one
decision: a publish that commits in between fails the link (Prisma
P2034), which ends at the generic "Google sign-in didn't work" with
nothing changed. Logs carry the user id and reason, never the email.

`GoogleStrategy` also requires Google's `email_verified` to be exactly
true (passport-google-oauth20 maps it to `emails[0].verified`); false or
missing is refused.

Email verification at password sign-up (after launch) would remove the
underlying gap. Until then, a refused person who can't sign in with the
password is handled by hand.
