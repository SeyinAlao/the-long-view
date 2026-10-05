import { Logger } from '@nestjs/common';
import { SecurityLog } from './security-log.service';

describe('SecurityLog', () => {
  const lines: string[] = [];
  const config = { get: (key: string) => (key === 'JWT_SECRET' ? 'unit-test-secret' : undefined) };
  let log: SecurityLog;

  beforeEach(() => {
    lines.length = 0;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => void lines.push(String(message)));
    jest.spyOn(Logger.prototype, 'error').mockImplementation((message: unknown) => void lines.push(String(message)));
    log = new SecurityLog(config as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('names a person and a network only by ref, the same ref each time', () => {
    log.loginFailed('bad_password', 'ada@example.com', '203.0.113.7');
    log.loginFailed('bad_password', 'ada@example.com', '203.0.113.7');
    expect(lines[0]).toMatch(/^auth_login_failed reason=bad_password acctRef=[0-9a-f]{12} ipRef=[0-9a-f]{12}$/);
    expect(lines[1]).toBe(lines[0]);
    expect(lines.join('\n')).not.toMatch(/ada|example|203\.0\.113/);
  });

  it('writes "-" when there is no IP', () => {
    log.throttled('account', 'login', null);
    expect(lines[0]).toBe('auth_throttled scope=account policy=login ipRef=-');
  });

  it('logs a 5xx by error name and code only, never the message', () => {
    const error = Object.assign(new Error('duplicate key value (email)=(ada@example.com)'), { code: 'P2002' });
    error.name = 'PrismaClientKnownRequestError';
    log.serverError('POST', '/theses/:id/publish', error);
    expect(lines[0]).toBe(
      'http_5xx method=POST route=/theses/:id/publish error=PrismaClientKnownRequestError code=P2002',
    );
  });

  it('drops a name or code that is not a plain word', () => {
    log.serverError('GET', '/x', { name: 'evil\nauth_login_failed', code: 'a b' });
    expect(lines[0]).toBe('http_5xx method=GET route=/x error=- code=-');
  });
});
