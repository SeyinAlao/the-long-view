import type { PrismaClient } from '../../generated/prisma/client';

// The operator's takedown (Terms, section 7): a thesis is hidden, never
// deleted. Hidden means: not graded (evaluation skips it), not in any
// public read, not in any score, and 404 to everyone but its author, who
// is told it was removed, without the reason. Unhiding reverses all of
// it; the thesis is then graded as if it had never been hidden.
//
// The reason is a short code, never free text, because the takedown
// script logs it: nothing personal can reach a log through it.
export const TAKEDOWN_REASON_PATTERN = /^[a-z0-9_]{3,60}$/;

export class TakedownError extends Error {}

type ThesisStore = Pick<PrismaClient, 'thesis'>;

export function assertValidReason(reason: string | undefined): string {
  if (!reason || !TAKEDOWN_REASON_PATTERN.test(reason)) {
    throw new TakedownError(
      'A reason is required: 3 to 60 characters of lower-case letters, digits and underscores, for example seed_placeholder_price.',
    );
  }
  return reason;
}

async function refusalFor(db: ThesisStore, id: string, action: 'hide' | 'unhide'): Promise<TakedownError> {
  const thesis = await db.thesis.findUnique({ where: { id }, select: { status: true, hiddenAt: true } });
  if (!thesis) return new TakedownError(`No thesis with id ${id}.`);
  if (action === 'hide' && thesis.status === 'DRAFT') {
    return new TakedownError(`Thesis ${id} is a draft: only published theses can be hidden.`);
  }
  if (action === 'hide') return new TakedownError(`Thesis ${id} is already hidden.`);
  return new TakedownError(`Thesis ${id} is not hidden.`);
}

// One conditional write each, so a repeat or a race changes nothing twice.
export async function hideThesis(db: ThesisStore, id: string, reason: string, now: Date = new Date()): Promise<void> {
  assertValidReason(reason);
  const { count } = await db.thesis.updateMany({
    where: { id, hiddenAt: null, status: { in: ['ACTIVE', 'EVALUATED'] } },
    data: { hiddenAt: now, hiddenReason: reason },
  });
  if (count === 0) throw await refusalFor(db, id, 'hide');
}

export async function unhideThesis(db: ThesisStore, id: string): Promise<void> {
  const { count } = await db.thesis.updateMany({
    where: { id, hiddenAt: { not: null } },
    data: { hiddenAt: null, hiddenReason: null },
  });
  if (count === 0) throw await refusalFor(db, id, 'unhide');
}
