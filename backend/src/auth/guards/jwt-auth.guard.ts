import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityLog } from '../../security/security-log.service';
import { isBadToken } from './bad-token';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly securityLog: SecurityLog) {
    super();
  }

  handleRequest<TUser = unknown>(err: unknown, user: unknown, info: unknown, context: ExecutionContext): TUser {
    if (isBadToken(info)) this.securityLog.sessionRejected('bad_token');
    return super.handleRequest(err, user, info, context);
  }
}
