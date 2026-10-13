import { assertValidReason, TakedownError } from './takedown';

// What scripts/takedown-thesis.ts accepts, kept here so it is unit
// tested without a database.
export interface TakedownArgs {
  action: 'hide' | 'unhide';
  id: string;
  reason?: string;
  write: boolean;
  confirmHost?: string;
}

// Hosts the script writes to without being told to: the local database
// and staging's direct host (docs/deployment.md). Anything else,
// production included, needs --confirm-host=<that host> as well.
const RECOGNISED_HOSTS = [/^localhost$/, /^127\.0\.0\.1$/, /^ep-bold-sky-a5oday2y\./];

export function isRecognisedHost(host: string): boolean {
  return RECOGNISED_HOSTS.some((pattern) => pattern.test(host));
}

export function assertHostAllowed(host: string, confirmHost: string | undefined): void {
  if (isRecognisedHost(host) || confirmHost === host) return;
  throw new TakedownError(
    `Refusing: ${host} is not a database this script knows. If it is the right one, run it again with --confirm-host=${host}`,
  );
}

export function parseTakedownArgs(argv: string[]): TakedownArgs {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const [action, id, reason, ...extra] = positional;

  if ((action !== 'hide' && action !== 'unhide') || !id || extra.length > 0) {
    throw new TakedownError('Usage: hide <thesis id> <reason> [--write] | unhide <thesis id> [--write]');
  }
  if (action === 'unhide' && reason) {
    throw new TakedownError('unhide takes no reason.');
  }
  if (action === 'hide') assertValidReason(reason);

  const confirm = flags.find((flag) => flag.startsWith('--confirm-host='));
  const unknown = flags.filter((flag) => flag !== '--write' && flag !== confirm);
  if (unknown.length > 0) throw new TakedownError(`Unknown option: ${unknown[0].split('=')[0]}`);

  return {
    action,
    id,
    reason,
    write: flags.includes('--write'),
    confirmHost: confirm?.slice('--confirm-host='.length),
  };
}
