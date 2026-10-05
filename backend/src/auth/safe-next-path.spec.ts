import { safeNextPath } from './safe-next-path';

describe('safeNextPath (API copy)', () => {
  it.each([['/theses/abc'], ['/dashboard'], ['/feed?ticker=MTNN']])('keeps a path on this site: %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ['https://evil.example'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['/\t/evil.example'],
    ['/\n/evil.example'],
    ['javascript:alert(1)'],
    ['theses/abc'],
    [''],
    [null],
    [undefined],
  ])('refuses anything else: %p', (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
