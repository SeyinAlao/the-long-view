import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

// The API's response headers (ADR 011). It only ever answers with JSON
// or a redirect, so its policy is the strictest there is: load nothing,
// frame nothing. Set before anything else runs, so a 403 from the edge
// check or a 429 carries them too.
export const API_SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  // Every response may be about one person (/auth/me, drafts, a session
  // cookie), so nothing is stored by a browser or a cache. A second
  // layer behind the frontend's x-vercel-enable-rewrite-caching: 0.
  // G5 must prove public pages still cache; if not, loosen this only
  // for named public GET routes.
  'Cache-Control': 'no-store',
};

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction) {
    res.removeHeader('X-Powered-By');
    for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) res.setHeader(name, value);
    next();
  }
}
