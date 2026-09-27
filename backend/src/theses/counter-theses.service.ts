import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterThesisDto } from './dto/create-counter-thesis.dto';

const AUTHOR_SELECT = { select: { id: true, username: true, name: true } } as const;

@Injectable()
export class CounterThesesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(thesisId: string, authorId: string, dto: CreateCounterThesisDto) {
    const thesis = await this.prisma.thesis.findUnique({ where: { id: thesisId } });

    if (!thesis) {
      throw new NotFoundException(`Thesis ${thesisId} not found`);
    }
    if (thesis.status === 'DRAFT') {
      throw new NotFoundException(`Thesis ${thesisId} not found`);
    }
    if (thesis.authorId === authorId) {
      throw new ForbiddenException('You cannot counter your own thesis');
    }

    try {
      return await this.prisma.counterThesis.create({
        data: {
          thesisId,
          authorId,
          targetPrice: dto.targetPrice,
          conviction: dto.conviction,
          horizonDays: dto.horizonDays,
          reasoning: dto.reasoning,
          risks: dto.risks,
          assumptions: dto.assumptions,
        },
        include: { author: AUTHOR_SELECT },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('You have already published a counter-thesis to this one');
      }
      throw error;
    }
  }

  async findForThesis(thesisId: string) {
    return this.prisma.counterThesis.findMany({
      where: { thesisId },
      orderBy: { publishedAt: 'asc' },
      include: { author: AUTHOR_SELECT },
    });
  }
}
