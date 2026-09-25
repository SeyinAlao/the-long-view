import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// For routes that are public but behave differently if the requester
// happens to be logged in (a thesis detail page needs to let its own
// author see their draft, but must not require login to read a
// published one). Unlike JwtAuthGuard, this never blocks the request —
// missing or invalid credentials just mean req.user stays undefined,
// the same as an anonymous visitor.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user || undefined) as TUser;
  }
}
