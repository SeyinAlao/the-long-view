# 007 — The browser talks to the backend through the frontend's own /api path

## Decision

The browser never calls the backend directly. Every browser request
goes to the frontend's own domain at `/api/...`, and a Next.js rewrite
forwards it to the backend. Server-side code (proxy.ts, Server
Components) still calls the backend directly, using the server-only
`BACKEND_URL`. Google's OAuth callback also lives on the frontend's
domain: `https://<frontend>/api/auth/google/callback`.

## Why

The session is an httpOnly cookie (ADR 002), and proxy.ts and Server
Components can only read cookies that belong to the frontend's domain.

Locally this was never a problem, and that hid it: browsers ignore the
port when scoping cookies, so a cookie set by `localhost:4000` is also
sent to `localhost:3000`. Deployed on two different domains, that stops
being true - the cookie would belong to the backend's domain, the
frontend would never see it, and every protected page would bounce a
logged-in person back to /login.

Routing through `/api` makes the backend's `Set-Cookie` arrive as a
first-party cookie of the frontend's domain. It needs no `Domain`
attribute, no `SameSite=None`, no shared parent domain, and no custom
domain - it works on two unrelated free hosting domains.

## Verified

Against a real production build (`next build` + `next start`):
registering through `/api` returns the cookie and stores it for the
frontend's host; `/api/auth/me` and gated pages work with it and
redirect without it; Google's redirect passes through with a callback
on the frontend's domain; logout clears it; public pages still render.

## Trade-offs accepted

- One extra network hop per browser API call.
- Vercel waits at most 120 seconds for the backend to start responding
  (its proxied request limit, on every plan). A sleeping free-tier
  backend takes about a minute to wake, so the first request after a
  quiet period is slow but should fit. Confirmed in staging, not here.
- `BACKEND_URL` is read when the frontend is built, so changing it
  needs a redeploy.
- A `x-vercel-enable-rewrite-caching: 0` header rule stops Vercel's CDN
  from ever caching an API response. Next's own server doesn't apply
  header rules to rewritten responses, so it only takes effect on
  Vercel - confirmed in staging, not here. It's a backstop: the backend
  sends no caching headers, so nothing is cached without it either.

## Status

Accepted.
