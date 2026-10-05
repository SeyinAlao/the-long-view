import { normaliseEmail } from './normalise-email';

describe('normaliseEmail', () => {
  it('lowercases and trims, so one address is always one account', () => {
    expect(normaliseEmail('  Ana.Bello@Example.COM ')).toBe('ana.bello@example.com');
  });

  it('leaves an already-normal address unchanged', () => {
    expect(normaliseEmail('ana@example.com')).toBe('ana@example.com');
  });
});
