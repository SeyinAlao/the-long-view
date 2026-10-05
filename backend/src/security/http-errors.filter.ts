import { ArgumentsHost, Catch, HttpException, Injectable } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RateLimitedException } from './rate-limited.exception';
import { SecurityLog } from './security-log.service';

// Nest's own error handling, plus two things: a 429 gets Retry-After,
// and any 5xx gets one log line - the method, the route pattern, and
// the error's name and code only (F-08). Never the message or the URL
// as sent: a Prisma message can quote data, and a URL can carry ids.
@Catch()
@Injectable()
export class HttpErrorsFilter extends BaseExceptionFilter {
  constructor(private readonly log: SecurityLog) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof RateLimitedException) {
      res.setHeader('Retry-After', String(exception.retryAfterSec));
    }
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      const route = (req.route as { path?: string } | undefined)?.path;
      this.log.serverError(req.method, route ? `${req.baseUrl}${route}` : 'unmatched', exception);
    }
    super.catch(exception, host);
  }
}
