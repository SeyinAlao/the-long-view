// The one form an email is stored and looked up in. The database column
// is citext as well, but a lookup whose value arrives typed as text is
// still compared case-sensitively, so the app never relies on that alone.
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}
