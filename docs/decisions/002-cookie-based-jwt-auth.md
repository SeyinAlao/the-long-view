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
