import { assertHostAllowed, isRecognisedHost, parseTakedownArgs } from './takedown-cli';

describe('takedown script arguments', () => {
  it('parses hide with a reason, defaulting to a dry run', () => {
    expect(parseTakedownArgs(['hide', 'abc123', 'seed_placeholder_price'])).toEqual({
      action: 'hide',
      id: 'abc123',
      reason: 'seed_placeholder_price',
      write: false,
      confirmHost: undefined,
    });
  });

  it('takes --write and --confirm-host', () => {
    const args = parseTakedownArgs([
      'hide',
      'abc123',
      'seed_placeholder_price',
      '--write',
      '--confirm-host=db.example.com',
    ]);
    expect(args).toMatchObject({ write: true, confirmHost: 'db.example.com' });
  });

  it('parses unhide, which takes no reason', () => {
    expect(parseTakedownArgs(['unhide', 'abc123', '--write'])).toMatchObject({ action: 'unhide', write: true });
    expect(() => parseTakedownArgs(['unhide', 'abc123', 'some_reason'])).toThrow(/no reason/);
  });

  it('refuses a missing or free-text reason, a missing id and unknown options', () => {
    expect(() => parseTakedownArgs(['hide', 'abc123'])).toThrow(/reason is required/);
    expect(() => parseTakedownArgs(['hide', 'abc123', 'Because I said so'])).toThrow(/reason is required/);
    expect(() => parseTakedownArgs(['hide', 'abc123', 'Because_I_said_so'])).toThrow(/reason is required/);
    expect(() => parseTakedownArgs(['hide'])).toThrow(/Usage/);
    expect(() => parseTakedownArgs(['hide', 'abc123', 'seed_placeholder_price', '--force'])).toThrow(/Unknown option/);
  });
});

describe('takedown script host check', () => {
  it('recognises the local database and the staging direct host only', () => {
    expect(isRecognisedHost('localhost')).toBe(true);
    expect(isRecognisedHost('127.0.0.1')).toBe(true);
    expect(isRecognisedHost('ep-bold-sky-a5oday2y.us-east-2.aws.neon.tech')).toBe(true);
    expect(isRecognisedHost('ep-bold-sky-a5oday2y-pooler.us-east-2.aws.neon.tech')).toBe(false);
    expect(isRecognisedHost('ep-other-1234.us-east-2.aws.neon.tech')).toBe(false);
  });

  it('refuses an unrecognised host unless that exact host is confirmed', () => {
    const host = 'ep-other-1234.us-east-2.aws.neon.tech';
    expect(() => assertHostAllowed(host, undefined)).toThrow(/Refusing/);
    expect(() => assertHostAllowed(host, 'another-host.example.com')).toThrow(/Refusing/);
    expect(() => assertHostAllowed(host, host)).not.toThrow();
    expect(() => assertHostAllowed('localhost', undefined)).not.toThrow();
  });
});
