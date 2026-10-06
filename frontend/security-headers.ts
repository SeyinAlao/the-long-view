// The frontend's security headers (ADR 011), used by next.config.ts.
// Kept beside it, not in lib/: it is read at build time, and its values
// are fixed into the build (so changing CSP_REPORT_ONLY needs a redeploy).
//
// One fixed policy for every page, not a per-request nonce: a nonce
// would make every page dynamic, which rules out the static pages and
// G5's edge caching (Next.js's CSP guide). So scripts keep
// 'unsafe-inline'; the main defence against injected script stays React
// escaping everything and the app never using dangerouslySetInnerHTML.
// What the policy still blocks: scripts or data from any other site,
// being framed, plugins, and <base> tricks.
type Options = { development: boolean; onVercel: boolean };

export function contentSecurityPolicy({ development, onVercel }: Options): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' only in development: React uses eval there for error
    // stacks; production doesn't need it (Next.js's CSP guide).
    `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
    // The conviction slider sets a style attribute; nonces never cover those.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // next/font/google serves the fonts from this site.
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Vercel only: locally the site is plain http://localhost.
    ...(onVercel ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

// Every page, not /api: the API sets its own, stricter headers, and the
// /api rule in next.config.ts must stay the only one there.
export function pageSecurityHeaders(env: NodeJS.ProcessEnv): { key: string; value: string }[] {
  const policy = contentSecurityPolicy({
    development: env.NODE_ENV === 'development',
    onVercel: env.VERCEL === '1',
  });
  // CSP_REPORT_ONLY=true: browsers report violations in the console but
  // block nothing - for checking a deploy (docs/deployment.md).
  const cspHeader = env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  return [
    { key: cspHeader, value: policy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    },
    // For browsers that predate frame-ancestors.
    { key: 'X-Frame-Options', value: 'DENY' },
    // Safe: Google sign-in is a full-page redirect, not a popup.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}
