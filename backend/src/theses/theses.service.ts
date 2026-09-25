import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecuritiesService } from '../securities/securities.service';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';

const THESIS_INCLUDE = { metrics: true, security: true } as const;

@Injectable()
export class ThesesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securitiesService: SecuritiesService,
  ) {}

  async createDraft(authorId: string, dto: CreateThesisDto) {
    // Reuses SecuritiesService's own lookup — including its 404 if the
    // ticker doesn't exist — rather than duplicating that check here.
    const security = await this.securitiesService.findByTicker(dto.ticker);

    return this.prisma.thesis.create({
      data: {
        authorId,
        securityId: security.id,
        targetPrice: dto.targetPrice,
        conviction: dto.conviction,
        horizonDays: dto.horizonDays,
        statement: dto.statement,
        bullCase: dto.bullCase,
        baseCase: dto.baseCase,
        bearCase: dto.bearCase,
        catalysts: dto.catalysts,
        risks: dto.risks,
        invalidationCondition: dto.invalidationCondition,
        metrics: dto.metrics?.length ? { create: dto.metrics } : undefined,
      },
      include: THESIS_INCLUDE,
    });
  }

  async updateDraft(id: string, authorId: string, dto: UpdateThesisDto) {
    await this.getOwnedDraftOrThrow(id, authorId);

    // Metrics are a full replace, not a merge — simplest correct
    // behavior for a short list edited through a form, and it avoids
    // any ambiguity about which existing row a partial update refers to.
    if (dto.metrics) {
      await this.prisma.thesisMetric.deleteMany({ where: { thesisId: id } });
    }

    return this.prisma.thesis.update({
      where: { id },
      data: {
        targetPrice: dto.targetPrice,
        conviction: dto.conviction,
        horizonDays: dto.horizonDays,
        statement: dto.statement,
        bullCase: dto.bullCase,
        baseCase: dto.baseCase,
        bearCase: dto.bearCase,
        catalysts: dto.catalysts,
        risks: dto.risks,
        invalidationCondition: dto.invalidationCondition,
        metrics: dto.metrics?.length ? { create: dto.metrics } : undefined,
      },
      include: THESIS_INCLUDE,
    });
  }

  async publish(id: string, authorId: string) {
    const thesis = await this.getOwnedDraftOrThrow(id, authorId);
    const security = await this.prisma.security.findUnique({
      where: { id: thesis.securityId },
    });

    return this.prisma.thesis.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
        // The whole point — see docs/decisions/004. Never taken from
        // user input, always the security's real price right now.
        referencePrice: security!.currentPrice,
      },
      include: THESIS_INCLUDE,
    });
  }

  async discardDraft(id: string, authorId: string) {
    await this.getOwnedDraftOrThrow(id, authorId);
    await this.prisma.thesis.delete({ where: { id } });
    return { success: true };
  }

  async findPublished(options: { ticker?: string; skip?: number; take?: number }) {
    const take = Math.min(options.take ?? 20, 50);

    return this.prisma.thesis.findMany({
      where: {
        status: { in: ['ACTIVE', 'EVALUATED'] },
        security: options.ticker ? { ticker: options.ticker.toUpperCase() } : undefined,
      },
      orderBy: { publishedAt: 'desc' },
      skip: options.skip ?? 0,
      take,
      include: THESIS_INCLUDE,
    });
  }

  async findMine(authorId: string) {
    return this.prisma.thesis.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      include: THESIS_INCLUDE,
    });
  }

  async findOne(id: string, requesterId?: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: { id },
      include: THESIS_INCLUDE,
    });

    if (!thesis) {
      throw new NotFoundException(`Thesis ${id} not found`);
    }

    // A draft belongs only to its author. Not-found, not forbidden —
    // confirming a draft with this id exists (just isn't yours) is
    // itself information a stranger shouldn't get.
    if (thesis.status === 'DRAFT' && thesis.authorId !== requesterId) {
      throw new NotFoundException(`Thesis ${id} not found`);
    }

    return thesis;
  }

  private async getOwnedDraftOrThrow(id: string, authorId: string) {
    const thesis = await this.prisma.thesis.findUnique({ where: { id } });

    if (!thesis) {
      throw new NotFoundException(`Thesis ${id} not found`);
    }
    if (thesis.authorId !== authorId) {
      throw new ForbiddenException('This thesis belongs to someone else');
    }
    if (thesis.status !== 'DRAFT') {
      throw new ForbiddenException('Published theses cannot be edited');
    }

    return thesis;
  }
}
