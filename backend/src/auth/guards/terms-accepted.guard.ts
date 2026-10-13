import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { SafeUser } from '../../users/users.service';

// Every write a person makes (drafts, publishing, counter-theses) needs
// the current Terms accepted (ADR 014). Reading never does. Goes after
// JwtAuthGuard, which puts the user on the request. The pages send people
// to /welcome/terms first; this is the check that doesn't depend on them.
@Injectable()
export class TermsAcceptedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request>().user as SafeUser | undefined;
    if (user?.termsAccepted) return true;
    throw new ForbiddenException({
      statusCode: 403,
      error: 'terms_not_accepted',
      message: 'Accept the current Terms of Service to write or publish. Reload the page to see them.',
    });
  }
}
