import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { HttpErrorsFilter } from './http-errors.filter';
import { RateLimitedException } from './rate-limited.exception';
import type { SecurityLog } from './security-log.service';

describe('HttpErrorsFilter', () => {
  const serverError = jest.fn();
  const filter = new HttpErrorsFilter({ serverError } as unknown as SecurityLog);
  const res = { setHeader: jest.fn() };
  const host = (route?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', baseUrl: '/theses', route: route ? { path: route } : undefined }),
        getResponse: () => res,
      }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
  });

  it('logs an unexpected error as a 5xx, by its route pattern', () => {
    const error = new Error('boom');
    filter.catch(error, host('/:id/publish'));
    expect(serverError).toHaveBeenCalledWith('POST', '/theses/:id/publish', error);
    expect(BaseExceptionFilter.prototype.catch).toHaveBeenCalled();
  });

  it('logs nothing for a 4xx, and adds Retry-After to a 429', () => {
    filter.catch(new NotFoundException(), host('/:id'));
    filter.catch(new RateLimitedException(42), host('/'));
    expect(serverError).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42');
  });

  it('says "unmatched" when the error came before routing', () => {
    filter.catch(new Error('boom'), host());
    expect(serverError).toHaveBeenCalledWith('POST', 'unmatched', expect.any(Error));
  });
});
