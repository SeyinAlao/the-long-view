# 002 — httpOnly cookie for the session, not a bearer token

## Decision

On register/login, the backend issues a JWT and sets it as an httpOnly,
sameSite=lax cookie (`session_token`) rather than returning it in the
response body for the frontend to store and send as an `Authorization`
header.

## Why

The frontend's route protection happens in `proxy.ts` (Next.js
middleware) — code that runs on the server, before a page renders, with
no access to `localStorage` or any client-side JS state. It can read
cookies on the incoming request directly, cheaply, on every request.
A header-based bearer token would mean the middleware has no way to know
whether a request is authenticated without either an extra round trip or
duplicating the token into a cookie anyway.

httpOnly also means the token is never reachable from JavaScript running
on the page, which closes off an entire class of XSS-driven token theft
that a `localStorage`-stored token would be exposed to.

## Trade-off accepted

This ties the API to being called from a browser with cookies enabled.
A future native mobile client or third-party API consumer would need a
separate auth path (e.g. a bearer-token issuance endpoint). Not a
concern yet — there is no such client today, and adding one later is a
new endpoint, not a rearchitecture of this one.

## Status

Accepted.

## Amendment, October 2026: revoking sessions

A JWT is valid until it expires, so on its own, signing out only deleted
the cookie in that one browser; a copied token kept working for up to 7
days. Each user now has a `sessionVersion`, and every token carries the
value it had when issued (`sv`). `JwtStrategy` already loads the user on
every request, and refuses a token whose `sv` doesn't match - no extra
query. Signing out raises the version, which ends **every** session that
person has, on every device. Accepted trade-off: there is no "sign out of
this device only". Tokens with no `sv` (issued before this) are refused,
so everyone signed in once more after it shipped.

Signing out needs no request body, so the session cookie's
`SameSite=Lax` is what stops another site's hidden form from signing
someone out everywhere: the browser doesn't send a Lax cookie on a
cross-site POST. It is set explicitly, because not every browser treats
a cookie without it as Lax. Tested in `backend/test/sessions.e2e-spec.ts`
(the header) and `e2e/tests/cross-site-logout.spec.ts` (a real browser).
