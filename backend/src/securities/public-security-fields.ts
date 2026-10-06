import type { Prisma } from '../../generated/prisma/client';

// The only Security columns the API ever returns, chosen in the database
// query itself. An allowlist, so a column added later stays private until
// it's added here. currentPrice and previousPrice stay out: they come from
// NGX, and the site never republishes NGX's price list (ADR 012). A
// thesis's own locked reference price is the thesis's, and still shown.
export const PUBLIC_SECURITY_FIELDS = {
  id: true,
  ticker: true,
  companyName: true,
} as const satisfies Prisma.SecuritySelect;
