import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StateStore } from 'passport-oauth2';
import { SignedCookieStateStore } from '../oauth-state-store';
import { googleEndpoints } from './google-endpoints';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService, jwt: JwtService) {
    super({
      // getOrThrow, not get() with a fallback: if these are ever missing
      // in any environment, the error should say exactly which config
      // key is absent, not "OAuth2Strategy requires a clientID option" —
      // a confusing message from inside a third-party library that gives
      // no hint about where to actually look.
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
      // The signed-cookie `state` (ADR 003): every callback must answer a
      // sign-in this browser started.
      // Cast: @types/passport-oauth2 only declares the 2- and 3-argument
      // store(); the 1.8.0 runtime also calls the 4-argument form that
      // receives the app state (oauth-state-store.spec.ts proves it).
      store: new SignedCookieStateStore(jwt, config.get<string>('NODE_ENV') === 'production') as unknown as StateStore,
      // Test-only endpoint overrides; empty unless set (see google-endpoints.ts).
      ...googleEndpoints(config),
    });
  }

  // Returns the profile, or false to refuse; Nest's PassportStrategy
  // passes the return value to Passport. It must never call Passport's
  // done itself as well: Passport would then hear twice (the second time
  // a failure), and the verified OAuth state on req.authInfo would be
  // overwritten - losing where to send the person back to.
  async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<GoogleProfile | false> {
    const primary = profile.emails?.[0];
    const email = primary?.value;
    if (!email) {
      throw new Error('Google account has no email on file');
    }
    // Sign-in by Google trusts that Google has verified the address (ADR
    // 003): an account with this email may be joined to it. The library
    // copies Google's email_verified here unchanged (JSON.parse of the
    // userinfo response). The OpenID Connect standard makes it a boolean,
    // but Google's own docs show the string "true", so exactly true or
    // exactly "true" count; false, "false", missing or anything else is
    // refused.
    if (!isVerified(primary?.verified)) {
      this.logger.warn('google_sign_in_refused reason=email_not_verified');
      return false;
    }
    return {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
    };
  }
}

function isVerified(flag: unknown): boolean {
  return flag === true || flag === 'true';
}
