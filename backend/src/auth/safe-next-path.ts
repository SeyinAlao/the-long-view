// A copy of frontend/lib/safe-next-path.ts, with the same rules and the
// same cases tested (safe-next-path.spec.ts): the API checks the ?next=
// it carries through Google sign-in itself, rather than trusting it.
//
// Where to send someone after they sign in, from a ?next= value anyone
// can put in a link. Only paths on this same site are allowed: without
// this check, /login?next=https://evil.example would forward a person
// there straight after a genuine sign-in (an "open redirect").
//
// Must start with exactly one "/". Rejects "//evil.example" (browsers
// treat that as another host), anything containing a backslash
// (browsers treat "/\evil.example" the same way), and whitespace or
// control characters (browsers strip those, which can turn "/\t/evil"
// into "//evil").
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  // Control characters are exactly what this rejects (see above).
  // eslint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
