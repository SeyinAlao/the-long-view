// The operator's takedown: hide a published thesis, or bring it back.
// Run from backend/ (docs/deployment.md, "Hiding a thesis"):
//   $env:DIRECT_URL = "<direct connection string>"
//   npm run content:hide -- <thesis id> <reason>            (dry run)
//   npm run content:hide -- <thesis id> <reason> --write
//   npm run content:unhide -- <thesis id> --write
//
// Deliberately no dotenv: backend/.env points at production, and this
// must only ever use the URL given for this run. A database host it does
// not recognise needs --confirm-host=<host>. Without --write nothing is
// written. It logs ids, reasons and the host name only: never a
// connection string, a statement or an author.
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hideThesis, TakedownError, unhideThesis } from '../src/theses/takedown';
import { assertHostAllowed, parseTakedownArgs } from '../src/theses/takedown-cli';

async function main() {
  const args = parseTakedownArgs(process.argv.slice(2));
  const raw = process.env.DIRECT_URL;
  if (!raw) throw new TakedownError('Set DIRECT_URL to the database to use, in this window only.');
  const host = new URL(raw).hostname;

  console.log(`Host: ${host}`);
  assertHostAllowed(host, args.confirmHost);

  const what = args.action === 'hide' ? `hide ${args.id} (reason: ${args.reason})` : `unhide ${args.id}`;
  if (!args.write) {
    console.log(`Dry run: would ${what}. Nothing written; add --write to apply.`);
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  try {
    if (args.action === 'hide') await hideThesis(prisma, args.id, args.reason as string);
    else await unhideThesis(prisma, args.id);
    console.log(`Done: ${what}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: { name?: string; message?: string }) => {
  // Name and message only: the message never contains the connection string.
  console.error(`FAILED: ${error.name ?? 'Error'}: ${error.message ?? ''}`);
  process.exit(1);
});
