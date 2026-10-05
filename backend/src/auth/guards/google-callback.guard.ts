import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SecurityLog } from '../../security/security-log.service';
import { STATE_REFUSED } from '../oauth-state-store';

// For Google's redirect back to us. Unlike GoogleAuthGuard, it never
// throws: a refused or failed sign-in (consent denied, an unverified
// email, a failed code exchange) leaves req.user empty, and the
// controller sends the person to /login with a readable message instead
// of a bare 401 page. Each failure is logged by kind only - never the
// message, which can carry text from the query string.
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  constructor(private readonly securityLog: SecurityLog) {
    super();
  }

  handleRequest<TUser = unknown>(err: unknown, user: unknown, info: unknown, context: ExecutionContext): TUser {
    if (!user) this.securityLog.googleFailed('guard', failureReason(err, info, context));
    return (user || undefined) as TUser;
  }
}

function failureReason(err: unknown, info: unknown, context: ExecutionContext): string {
  if (err) {
    const name = (err as { name?: unknown }).name;
    return `error:${typeof name === 'string' && /^\w{1,40}$/.test(name) ? name : 'unknown'}`;
  }
  if ((info as { message?: unknown } | undefined)?.message === STATE_REFUSED) return 'state';
  if (context.switchToHttp().getRequest<Request>().query.error === 'access_denied') return 'denied';
  // GoogleStrategy.validate refused the profile (it logs why).
  return 'refused';
}
