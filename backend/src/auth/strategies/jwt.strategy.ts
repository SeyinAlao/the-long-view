import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

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
  async validate(payload: { sub: string; email: string; sv?: number }) {
    const found = await this.usersService.findSessionUser(payload.sub);
    if (!found) {
      throw new UnauthorizedException('User no longer exists');
    }
    if (payload.sv !== found.sessionVersion) {
      throw new UnauthorizedException('This session has ended. Sign in again.');
    }
    return found.user;
  }
}
