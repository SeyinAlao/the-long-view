import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { safeNextPath } from '../safe-next-path';

// Starts Google sign-in. Passes where to return to (a checked ?next=) as
// the OAuth state, which the signed-cookie store keeps, and asks Google
// to always show its account chooser.
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const query = context.switchToHttp().getRequest<Request>().query;
    const next = safeNextPath(typeof query.next === 'string' ? query.next : null);
    return {
      // An object, never a string: passport-oauth2 sends a string state to
      // Google as it is, skipping the store - and its check - entirely.
      state: next ? { next } : {},
      // Lets someone with several Google accounts choose, instead of being
      // signed in silently with whichever is active.
      prompt: 'select_account',
    };
  }
}
