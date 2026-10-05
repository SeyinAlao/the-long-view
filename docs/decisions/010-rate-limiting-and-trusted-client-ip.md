# 010 — Rate limiting, and where the client IP comes from

## Decision

The API limits requests per client IP and failed password sign-ins per
account, in memory. It learns the client IP only from the frontend,
which proves it is the frontend with a shared secret, the **edge key**.

- **The edge key.** `EDGE_PROXY_KEY` is set on Vercel (Production and
  Preview) and on Render, the same random value on both. The frontend's
  `proxy.ts` runs on every `/api/...` request. It drops any `x-tlv-*`
  header the browser sent, then adds `x-tlv-edge-key` and, on Vercel,
  `x-tlv-client-ip` from Vercel's `x-real-ip`. Vercel sets that header
  itself and overwrites a client's value. The frontend's own server-side
  calls (Server Components, the session check in `proxy.ts`) send the
  key with no client IP.
- **The API believes nothing else.** It never reads `X-Forwarded-For`,
  `X-Real-IP` or Express's `req.ip`. `trust proxy` stays off.
  `x-tlv-client-ip` counts only on a request whose key matches, compared
  in constant time.
- **Direct requests are refused.** With `EDGE_PROXY_ENFORCE=true`, a
  request without the key gets 403, except `/health`, which the uptime
  monitor calls directly. Every browser request already goes through
  Vercel, including Google's redirect back (`GOOGLE_CALLBACK_URL` is on
  the frontend's domain), so this costs real users nothing. In
  production the API refuses to start without a key.
- **Limits.** Every number is in `backend/src/security/rate-limits.ts`.
  Per IP: 1,000 a minute for reads, 30 per 15 minutes for login, 30 an
  hour for sign-ups, 30 per 15 minutes for each Google sign-in route,
  and 60 per 15 minutes for thesis writes. Per account: 10 failed
  password sign-ins per 15 minutes, from any IP, checked before bcrypt.
  An IPv6 client is counted by its /64.
- **Requests without a client IP** aren't limited per IP: our own
  server-side fetches, the health check, and local development. Server
  rendering of public pages is the gap; edge caching (G5) narrows it.
- **The 429.** It has the same words whichever limit was hit, so it
  never says whether an email has an account, plus `Retry-After`. The
  Google sign-in routes redirect to `/login?error=google-busy` instead,
  because they are page loads, not fetches.
- **Memory.** Each limiter is a fixed-window counter capped at 20,000
  keys. When full, the entry closest to expiring is dropped first. A
  restart forgets every count. That is acceptable on one Render instance
  that the uptime monitor keeps awake; more than one instance would need
  a shared store.
- **Logging (audit item F-08).** `SecurityLog` writes every security
  line: failed sign-ins, throttles, rejected session tokens, Google
  sign-in failures at the guard, unverified edge requests, a full
  limiter, and every 5xx (method, route pattern, error name and code).
  People and networks appear only as 12-character HMAC refs, keyed from
  `JWT_SECRET`. It never logs passwords, tokens, cookies, emails, raw
  IPs or error messages.

## Why

- **`X-Forwarded-For` can't be trusted here.** The API is reachable
  directly at its onrender.com address, where the caller writes that
  header. Render doesn't document how it treats a client-supplied one.
  The only public word is a 2021 feedback thread in which a user reports
  that Render appends to it and staff say the first entry is the real
  client. Through Vercel, the nearest hop is Vercel's shared egress, not
  the person. NestJS's own example (`req.ips[0]`) takes the leftmost
  entry, which is the one a caller controls.
- **Shared networks.** Many people in Nigeria share one public address
  through their mobile network, so per-IP numbers are generous and the
  strict limits are on login and writes.
- **No `@nestjs/throttler`.** Its memory store keeps one timestamp per
  hit and has no cap on keys. Meeting the memory cap would have meant
  replacing its storage, tracker, skip logic and exception. Two small
  files do the job with nothing new installed.
- **Account limits accept one trade-off.** Someone who knows an email
  can keep that person out of password sign-in for 15 minutes; Google
  sign-in still works. This is OWASP's usual compromise for stopping
  password guessing.

## Rolled out in two steps

`EDGE_PROXY_ENFORCE` is unset at first. The API lets requests without
the key through and logs `edge_unverified`, which shows whether the
headers really arrive through Vercel's rewrite. That has only been
proven locally, with `next start`. Then it is set to `true`. Steps are in
docs/deployment.md, "The edge key".

**If the headers don't arrive on Vercel**, the fallback is to do the
rewrite inside `proxy.ts`
(`NextResponse.rewrite(new URL(path, BACKEND_URL), { request: { headers } })`)
and remove the `/api` rewrite from `next.config.ts`. Next.js documents
request headers set in proxy as reaching "rewrite destinations". Its
pages don't say whether that includes an external URL, so the same check
would be repeated.

## Also available, not used yet

Vercel's firewall has rate limiting on Hobby: one rule per project,
counted by IP or JA4 fingerprint, a fixed window of 10 seconds to 10
minutes, 1,000,000 allowed requests included, and counters kept per
region. It could be a coarse outer layer on `/api/auth/*` in front of
this. It is set up in the dashboard, so it isn't part of this change.
