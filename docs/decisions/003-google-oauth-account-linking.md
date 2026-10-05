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

`GoogleStrategy` also requires Google's `email_verified` to say verified
(passport-google-oauth20 copies it unchanged to `emails[0].verified`):
exactly `true`, or exactly the string `"true"`, which is how Google's own
OpenID Connect docs show it (the standard says boolean). False, `"false"`,
missing or any other value is refused.

Email verification at password sign-up (after launch) would remove the
underlying gap. Until then, a refused person who can't sign in with the
password is handled by hand.

## Amendment, October 2026: sign-in state and return path

Every Google callback must answer a sign-in that this browser started
(the OAuth specification's CSRF requirement, which Google's guide repeats).
`/auth/google` now issues a random handle as the OAuth `state` and
keeps it, with where to return to (`next`, checked by `safeNextPath` on
the way in and again on the way out), in a signed `oauth_state` cookie:
`HttpOnly`, `SameSite=Lax`, `Path=/`, ten minutes, its own `typ` so it
can never pass as a session token (or one as it). The callback refuses a
missing, expired, foreign or mismatched state, and clears the cookie
whatever happens. The "Google is now how you sign in" notice takes
priority over `next`.

- **No PKCE.** Google's guide for web-server (confidential) clients
  documents `state` as the CSRF defence and doesn't document PKCE for
  them; the client secret already protects the code exchange.
- **`prompt=select_account`** on the authorisation request, so Google
  always shows its account chooser rather than silently using whichever
  account is active. Nothing else about the start request changed (a
  test lists its exact parameters).
- **Pinned libraries.** The store relies on passport-oauth2 1.8.0's
  internals (arity-based store/verify, and only an object `state`
  reaching the store), so passport-oauth2 and passport-google-oauth20
  are pinned exactly, and a unit test runs the real library.
- `GoogleStrategy.validate` now returns its result instead of calling
  Passport's `done` as well; the double call made Passport report a
  failure after the success and overwrote the verified state.
