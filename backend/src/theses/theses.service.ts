import { Prisma } from '../../generated/prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

const STILL_DRAFT = { status: 'DRAFT' } as const;

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
    const securityId = dto.ticker
      ? (await this.securitiesService.findByTicker(dto.ticker)).id
      : undefined;

    // Metrics are a full replace, not a merge — simplest correct
    // behavior for a short list edited through a form, and it avoids
    // any ambiguity about which existing row a partial update refers to.
    // One transaction, so if the thesis was published meanwhile and the
    // update below finds no draft, the metrics are left as they were.
    return this.whileStillDraft(() =>
      this.prisma.$transaction(async (tx) => {
        if (dto.metrics) {
          await tx.thesisMetric.deleteMany({ where: { thesisId: id } });
        }
        return tx.thesis.update({
          where: { id, ...STILL_DRAFT },
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
      }),
    );
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

    if (
      !latestPrice ||
      latestPrice.recordedAt.getTime() < Date.now() - MAX_REFERENCE_PRICE_AGE_MS
    ) {
      throw new ConflictException(
        "This company doesn't have a current market price yet, so the thesis can't be published - " +
          'its reference price would be wrong, and it can never change once published. ' +
          'Your draft is saved; try again after the next daily price update.',
      );
    }

    // Conditioned on still being a draft, so a second publish racing this
    // one can never overwrite the locked reference price.
    return this.whileStillDraft(() =>
      this.prisma.thesis.update({
        where: { id, ...STILL_DRAFT },
        data: {
          status: 'ACTIVE',
          publishedAt: new Date(),
          // The whole point - see docs/decisions/004. Never taken from
          // user input: the latest real market price at this moment.
          referencePrice: latestPrice.price,
        },
        include: THESIS_INCLUDE,
      }),
    );
  }

  async discardDraft(id: string, authorId: string) {
    await this.getOwnedDraftOrThrow(id, authorId);
    await this.whileStillDraft(() => this.prisma.thesis.delete({ where: { id, ...STILL_DRAFT } }));
    return { success: true };
  }

  // getOwnedDraftOrThrow is a separate query, so a publish can land
  // between that check and the write (audit F-11). Every write to a draft
  // is therefore conditioned on STILL_DRAFT too; if the thesis was
  // published meanwhile, the write matches nothing and Prisma throws
  // P2025, which is the same refusal the check gives.
  private async whileStillDraft<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ForbiddenException('Published theses cannot be edited');
      }
      throw error;
    }
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
