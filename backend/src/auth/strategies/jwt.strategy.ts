import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SecurityLog } from '../../security/security-log.service';

// Reads the session from the httpOnly cookie set at login, not an
// Authorization header — the frontend's middleware (proxy.ts) needs to
// read this same cookie server-side, which only works if it's a cookie
// in the first place.
function extractFromCookie(req: Request): string | null {
  return req?.cookies?.session_token ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly securityLog: SecurityLog,
  ) {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  // The token must still carry the user's current session version. A
  // token without one predates session revocation and is refused too, so
  // every token issued before it shipped stopped working (ADR 002).
  async validate(payload: { sub?: unknown; email: string; sv?: number; typ?: unknown }) {
    // A session token has a subject and no `typ`. Anything else signed
    // with the same secret (the Google sign-in state cookie) is refused.
    if (typeof payload.sub !== 'string' || payload.typ !== undefined) {
      this.securityLog.sessionRejected('invalid');
      throw new UnauthorizedException('Invalid session');
    }
    const found = await this.usersService.findSessionUser(payload.sub);
    if (!found) {
      this.securityLog.sessionRejected('no_user');
      throw new UnauthorizedException('User no longer exists');
    }
    if (payload.sv !== found.sessionVersion) {
      this.securityLog.sessionRejected('ended');
      throw new UnauthorizedException('This session has ended. Sign in again.');
    }
    return found.user;
  }
}
