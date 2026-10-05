// passport-jwt reports a token that is forged, tampered with or garbled
// as a JsonWebTokenError. Expired tokens (TokenExpiredError) and missing
// ones are normal and not logged; this one is worth a security log line.
export function isBadToken(info: unknown): boolean {
  return (info as { name?: unknown } | undefined)?.name === 'JsonWebTokenError';
}
