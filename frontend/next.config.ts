import type { NextConfig } from 'next';
import { pageSecurityHeaders } from './security-headers';

// Server-only on purpose - see lib/backend-url.ts. Read here directly
// rather than imported, since this file is evaluated at build time,
// before the app's own modules are part of the picture.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No "X-Powered-By: Next.js" (ADR 011).
  poweredByHeader: false,

  // The browser calls /api/... on this app's own domain, and this
  // forwards it to the backend. That makes the session cookie a
  // first-party cookie of the frontend's domain - the only place
  // proxy.ts and Server Components can read it. Without this, the
  // cookie lands on the backend's domain once the two are deployed
  // separately. See docs/decisions/007-same-origin-api-proxy.md.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND_URL}/:path*` }];
  },

  async headers() {
    return [
      // Every page; never /api, which the API's own headers cover (ADR 011).
      { source: '/((?!api/).*)', headers: pageSecurityHeaders(process.env) },
      {
        source: '/api/:path*',
        // Never let Vercel's CDN cache an API response. These carry
        // per-person data (/auth/me, drafts, session cookies) - one
        // cached response served to the wrong person would be a real
        // data leak. The API also sends Cache-Control: no-store (ADR
        // 011); this stays as the layer that doesn't depend on it.
        // e2e/tests/security-headers.spec.ts fails if it goes.
        headers: [{ key: 'x-vercel-enable-rewrite-caching', value: '0' }],
      },
    ];
  },
};

export default nextConfig;
