import { UnauthorizedException } from '@nestjs/common';

export type LoginFailureReason = 'unknown_email' | 'bad_password' | 'google_only';

// A failed password sign-in. The reason goes to the security log only
// (AuthController); the person sees the message, which is the same for
// an unknown email and a wrong password.
export class LoginFailedException extends UnauthorizedException {
  constructor(
    readonly reason: LoginFailureReason,
    message = 'Invalid email or password',
  ) {
    super(message);
  }
}
