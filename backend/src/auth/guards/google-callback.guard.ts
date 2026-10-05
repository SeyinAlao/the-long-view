import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// For Google's redirect back to us. Unlike GoogleAuthGuard, it never
// throws: a refused or failed sign-in (consent denied, an unverified
// email, a failed code exchange) leaves req.user empty, and the
// controller sends the person to /login with a readable message instead
// of a bare 401 page.
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user || undefined) as TUser;
  }
}
