import { HttpException, HttpStatus } from '@nestjs/common';

// A 429 that knows when to try again. The same words whichever limit
// was hit (per IP or per account), so a 429 never says whether an email
// has an account. HttpErrorsFilter adds the Retry-After header.
export class RateLimitedException extends HttpException {
  constructor(readonly retryAfterSec: number) {
    super(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: tooManyMessage(retryAfterSec) },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function tooManyMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  const wait = minutes <= 1 ? 'a minute' : `${minutes} minutes`;
  return `Too many attempts. Try again in ${wait}.`;
}
