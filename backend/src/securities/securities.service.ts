import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLIC_SECURITY_FIELDS } from './public-security-fields';

@Injectable()
export class SecuritiesService {
  constructor(private readonly prisma: PrismaService) {}

  // Only companies with at least one real price row: one with none (STACO,
  // missing from NGX's feed) could never be published on, so the company
  // search doesn't offer it. A price's age is checked when publishing.
  async search(query?: string) {
    return this.prisma.security.findMany({
      select: PUBLIC_SECURITY_FIELDS,
      where: {
        prices: { some: {} },
        ...(query && {
          OR: [
            { ticker: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { ticker: 'asc' },
      take: 20,
    });
  }

  // Not limited to priced companies: an existing draft on one still shows
  // its company, and publishing refuses it with a clear message.
  async findByTicker(ticker: string) {
    const security = await this.prisma.security.findUnique({
      select: PUBLIC_SECURITY_FIELDS,
      where: { ticker: ticker.toUpperCase() },
    });

    if (!security) {
      throw new NotFoundException(`No security listed with ticker ${ticker}`);
    }

    return security;
  }
}
