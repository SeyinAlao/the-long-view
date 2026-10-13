// The version of the Terms of Service and Privacy Policy (docs/legal/)
// that people accept: the date the current text took effect. Changing it
// asks everyone to accept again at their next sign-in or write, because
// User.termsVersion no longer matches (ADR 014). Change it in the same
// PR as the documents, and only for a change people need to agree to.
export const TERMS_VERSION = '2026-10-07';

export function hasAcceptedCurrentTerms(user: { termsVersion: string | null }): boolean {
  return user.termsVersion === TERMS_VERSION;
}
