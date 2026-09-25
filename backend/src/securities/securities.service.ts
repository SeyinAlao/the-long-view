import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecuritiesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query?: string) {
    if (!query) {
      return this.prisma.security.findMany({
        orderBy: { ticker: 'asc' },
        take: 20,
      });
    }

    return this.prisma.security.findMany({
      where: {
        OR: [
          { ticker: { contains: query, mode: 'insensitive' } },
          { companyName: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { ticker: 'asc' },
      take: 20,
    });
  }

  async findByTicker(ticker: string) {
    const security = await this.prisma.security.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });

    if (!security) {
      throw new NotFoundException(`No security listed with ticker ${ticker}`);
    }

    return security;
  }
}
