import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityLog } from '../../security/security-log.service';
import { isBadToken } from './bad-token';

// For routes that are public but behave differently if the requester
// happens to be logged in (a thesis detail page needs to let its own
// author see their draft, but must not require login to read a
// published one). Unlike JwtAuthGuard, this never blocks the request —
// missing or invalid credentials just mean req.user stays undefined,
// the same as an anonymous visitor. A forged or garbled token is still
// logged.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly securityLog: SecurityLog) {
    super();
  }

  handleRequest<TUser = unknown>(_err: unknown, user: unknown, info: unknown): TUser {
    if (isBadToken(info)) this.securityLog.sessionRejected('bad_token');
    return (user || undefined) as TUser;
  }
}
