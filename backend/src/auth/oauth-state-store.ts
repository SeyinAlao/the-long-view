import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import type { JwtService } from '@nestjs/jwt';

// Google sign-in's `state`: proof that a callback answers a sign-in this
// browser started (no one can sign you in to their account by sending you
// a callback link), and the place the person came from (`next`). No
// server-side session exists, so it lives in a short-lived signed cookie.
//
// This plugs into passport-oauth2's state-store interface, pinned at
// 1.8.0: it picks store/verify by their arity (4 and 3 here, no PKCE),
// and only an object `state` reaches the store - a string skips it.
// oauth-state-store.spec.ts runs the real library to catch any change.

export const OAUTH_STATE_COOKIE = 'oauth_state';
const TYP = 'oauth-state';
const TEN_MINUTES_MS = 10 * 60 * 1000;

export interface OAuthAppState {
  next?: string;
}

// Path=/: the cookie is set by /api/auth/google, through the frontend's
// rewrite (ADR 007), and must reach /api/auth/google/callback. SameSite=
// Lax: sent on Google's top-level redirect back, never on a cross-site
// sub-request.
export function stateCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/' };
}

export class SignedCookieStateStore {
  constructor(
    private readonly jwt: JwtService,
    private readonly secure: boolean,
  ) {}

  store(req: Request, state: OAuthAppState | undefined, _meta: unknown, callback: (err: Error | null, handle?: string) => void): void {
    try {
      const handle = randomBytes(24).toString('base64url');
      const token = this.jwt.sign({ typ: TYP, h: handle, next: state?.next }, { expiresIn: '10m' });
      req.res!.cookie(OAUTH_STATE_COOKIE, token, { ...stateCookieOptions(this.secure), maxAge: TEN_MINUTES_MS });
      callback(null, handle);
    } catch (error) {
      callback(error as Error);
    }
  }

  // The cookie is cleared by the callback handler on every outcome; this
  // only reads it.
  verify(req: Request, providedState: unknown, callback: (err: Error | null, ok?: boolean, state?: OAuthAppState | { message: string }) => void): void {
    const refuse = () => callback(null, false, { message: 'Invalid authorization request state.' });
    const token: unknown = req.cookies?.[OAUTH_STATE_COOKIE];
    if (typeof token !== 'string' || typeof providedState !== 'string') return refuse();

    let payload: { typ?: unknown; h?: unknown; next?: unknown };
    try {
      payload = this.jwt.verify(token);
    } catch {
      return refuse(); // bad signature or expired
    }
    if (payload.typ !== TYP || typeof payload.h !== 'string' || !sameString(payload.h, providedState)) return refuse();

    callback(null, true, { next: typeof payload.next === 'string' ? payload.next : undefined });
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
