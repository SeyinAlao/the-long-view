import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecuritiesService } from '../securities/securities.service';
import { PUBLIC_SECURITY_FIELDS } from '../securities/public-security-fields';
import { CreateThesisDto } from './dto/create-thesis.dto';
import { UpdateThesisDto } from './dto/update-thesis.dto';

// select, not include, for author — this is the one place a thesis
// response touches the User model, and it must never be able to leak
// passwordHash or googleId by accident the way a bare `include` could
// if the User model ever grows a new field.
// A thesis is graded against its reference price forever, so that price has
// to be a real market price, and a recent one. Seven days covers weekends
// and NGX's longest public-holiday closures, while still noticing within a
// week if the daily price job has stopped working.
const MAX_REFERENCE_PRICE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const THESIS_INCLUDE = {
  metrics: true,
  security: { select: PUBLIC_SECURITY_FIELDS },
  author: { select: { id: true, username: true, name: true } },
} as const;

// Only for a single thesis (findOne) — the feed and "my theses" list
// don't need every counter-thesis's full detail pulled in on every row,
// so this stays separate from THESIS_INCLUDE rather than bloating every
// query with it.
const THESIS_DETAIL_INCLUDE = {
  ...THESIS_INCLUDE,
  counterTheses: {
    orderBy: { publishedAt: 'asc' as const },
    include: { author: { select: { id: true, username: true, name: true } } },
  },
  outcome: true,
} as const;

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

    // Resolved before anything below is written or deleted: an unknown
    // ticker must fail the whole save with a 404, not fail halfway
    // through with this draft's metrics already deleted.
    const securityId = dto.ticker ? (await this.securitiesService.findByTicker(dto.ticker)).id : undefined;

    // Metrics are a full replace, not a merge — simplest correct
    // behavior for a short list edited through a form, and it avoids
    // any ambiguity about which existing row a partial update refers to.
    if (dto.metrics) {
      await this.prisma.thesisMetric.deleteMany({ where: { thesisId: id } });
    }

    return this.prisma.thesis.update({
      where: { id },
      data: {
        securityId,
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

    // The most recent price actually fetched from NGX, from the history
    // the daily price job records. Security.currentPrice can't be trusted
    // for this on its own: the seed fills it with a placeholder, and that
    // placeholder would be locked into a published thesis forever.
    const latestPrice = await this.prisma.price.findFirst({
      where: { securityId: thesis.securityId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latestPrice || latestPrice.recordedAt.getTime() < Date.now() - MAX_REFERENCE_PRICE_AGE_MS) {
      throw new ConflictException(
        "This company doesn't have a current market price yet, so the thesis can't be published - " +
          'its reference price would be wrong, and it can never change once published. ' +
          'Your draft is saved; try again after the next daily price update.',
      );
    }

    return this.prisma.thesis.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date(),
        // The whole point - see docs/decisions/004. Never taken from
        // user input: the latest real market price at this moment.
        referencePrice: latestPrice.price,
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
      include: THESIS_DETAIL_INCLUDE,
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
