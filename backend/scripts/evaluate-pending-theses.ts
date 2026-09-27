// Manual, on-demand trigger for the same evaluation the scheduler runs
// automatically once a day — for testing, or for catching up
// immediately after fresh price data lands.
// Run with: npm run evaluate:pending (from backend/).
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { EvaluationService } from '../src/evaluation/evaluation.service';
import type { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const service = new EvaluationService(prisma as unknown as PrismaService);

  const result = await service.evaluatePendingTheses();
  console.log(`Evaluated ${result.evaluated} theses. ${result.stillPending} still awaiting price data.`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
