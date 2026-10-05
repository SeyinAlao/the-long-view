import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
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
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const primary = profile.emails?.[0];
    const email = primary?.value;
    if (!email) {
      return done(new Error('Google account has no email on file'), undefined);
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
      return done(null, false);
    }
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
    };
    done(null, googleProfile);
  }
}

function isVerified(flag: unknown): boolean {
  return flag === true || flag === 'true';
}
