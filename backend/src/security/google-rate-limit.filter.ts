import { ArgumentsHost, Catch, ExceptionFilter, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { RateLimitedException } from './rate-limited.exception';

// The Google sign-in routes are browser navigations, not fetches: a
// throttled one sends the person back to /login with a readable message
// instead of a page of raw JSON. The message: frontend
// components/auth/google-sign-in-error.tsx ("google-busy").
@Catch(RateLimitedException)
@Injectable()
export class GoogleRateLimitFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: RateLimitedException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    res.setHeader('Retry-After', String(exception.retryAfterSec));
    res.redirect(`${frontendUrl}/login?error=google-busy`);
  }
}
