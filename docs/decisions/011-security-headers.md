# 011 — Security headers and the Content Security Policy

## Decision

**Pages** (the frontend, `frontend/security-headers.ts`, applied by
`next.config.ts` to every path except `/api/*`) get one fixed policy,
the same for every request:

- **Content-Security-Policy:**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'`, plus `'unsafe-eval'` in development only
  - `style-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob:`
  - `font-src 'self'`
  - `connect-src 'self'`
  - `object-src 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
  - `frame-ancestors 'none'`
  - `upgrade-insecure-requests`, on Vercel only.
- **Also:**
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - a `Permissions-Policy` that turns off the camera, microphone, geolocation, payment, USB and topics APIs
  - `X-Frame-Options: DENY`
  - `Cross-Origin-Opener-Policy: same-origin`
  - no `X-Powered-By`.
- **No HSTS from us.** Vercel already sends
  `max-age=63072000; includeSubDomains; preload` on every `*.vercel.app`
  domain, and Plan A stays on `vercel.app`.
- **`CSP_REPORT_ONLY=true`**, a Vercel variable read at build time,
  sends the same policy as `Content-Security-Policy-Report-Only`. Use it
  to check a deploy before enforcing (docs/deployment.md,
  "Content Security Policy: Report-Only, then enforce").

**The API** (`backend/src/security/security-headers.middleware.ts`)
answers only with JSON or redirects. Every response, including the edge
check's 403 and a 429, gets:

- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`
- no `X-Powered-By`.

**The `/api` rule stays.** `next.config.ts`'s
`x-vercel-enable-rewrite-caching: 0` on `/api/*` is the only header rule
there. The API's `no-store` is a second layer, not a replacement.

## Why

- **No nonce.** Next.js applies a nonce only to pages rendered per
  request. Its CSP guide says that with nonces "all pages must be
  dynamically rendered": static optimisation and ISR are off, pages
  "cannot be cached by CDNs", and Partial Prerendering is incompatible.
  Today `/`, `/login`, `/signup` and the error pages are static, and G5
  exists to cache the Ledger and Leaderboard at the edge. A nonce would
  also put `proxy.ts` on every page view, against Hobby's function
  allowance.
- **What `'unsafe-inline'` costs.** The CSP is not the main defence
  against injected script; React escaping all output, and no
  `dangerouslySetInnerHTML` anywhere, is. The policy still blocks
  scripts and data from other sites, framing, plugins and `<base>`
  tricks, and allows no `eval` in production.
- **Styles** need `'unsafe-inline'` anyway: the conviction slider sets a
  `style` attribute, and nonces never cover style attributes.
- **`form-action 'self'` is safe.** The Google button is a link, not a
  form, so its redirect to Google isn't a form action. The other forms
  submit through JavaScript.
- **COOP `same-origin` is safe.** Google sign-in is a full-page
  redirect, not a popup.
- **API `no-store` everywhere for now.** Any response may concern one
  person. **G5 must prove public pages still cache** with it. If they
  don't, loosen it only for named public GET routes.

## Consequences

- **Zod is `jitless`** (`frontend/lib/thesis-schema.ts`). Otherwise it
  probes `new Function("")`, and browsers report even that caught probe
  as a violation.
- **The browser tests fail on any CSP violation.** A shared fixture
  listens for `securitypolicyviolation` on every page. Test helpers must
  pass functions, not strings, to Playwright's `waitForFunction`, which
  runs strings through `eval`.
- **`next start` doesn't add `next.config` headers to the `/api`
  rewrite**, because it goes to another host (checked 6 October). So the
  `/api` rule is tested by reading the config. On Vercel it is a CDN
  directive, checked live with `curl` (docs/deployment.md, verification
  checklist).
- **Vercel Web Analytics** (go-live) loads its script and sends its
  events on this site's own paths (`/_vercel/insights/*` or a
  per-project path), so `'self'` should cover it. Check it under
  Report-Only when it is added.
- **The Vercel Toolbar** needs `https://vercel.live` and more (Vercel's
  docs), which this policy doesn't allow, so it won't load. Turn it off
  for the project (Settings, General, Vercel Toolbar), or ignore
  violations that name `vercel.live`.

## Later

**SRI (Next.js's experimental `sri` option) is a post-launch spike.**
It hashes our scripts at build time and could allow dropping
`'unsafe-inline'` from `script-src` while keeping static pages and edge
caching. It is experimental, and whether Next's inline startup scripts
pass without `'unsafe-inline'` isn't verified (docs/backlog.md).
