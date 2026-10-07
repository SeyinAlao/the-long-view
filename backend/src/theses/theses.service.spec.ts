import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThesesService } from './theses.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecuritiesService } from '../securities/securities.service';

describe('ThesesService', () => {
  let service: ThesesService;
  let prisma: {
    thesis: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    security: { findUnique: jest.Mock };
    price: { findFirst: jest.Mock };
    thesisMetric: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let securities: { findByTicker: jest.Mock };

  const draftThesis = {
    id: 'thesis_1',
    authorId: 'author_1',
    securityId: 'sec_1',
    status: 'DRAFT',
  };

  beforeEach(() => {
    prisma = {
      thesis: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      security: { findUnique: jest.fn() },
      price: { findFirst: jest.fn() },
      thesisMetric: { deleteMany: jest.fn() },
      // Runs the callback against this same mock, as one transaction would.
      $transaction: jest.fn((write: (tx: unknown) => unknown) => write(prisma)),
    };
    securities = { findByTicker: jest.fn() };
    service = new ThesesService(prisma as unknown as PrismaService, securities as unknown as SecuritiesService);
  });

  describe('immutability', () => {
    it('refuses to update a thesis that is no longer a draft', async () => {
      prisma.thesis.findUnique.mockResolvedValue({ ...draftThesis, status: 'ACTIVE' });

      await expect(service.updateDraft('thesis_1', 'author_1', { conviction: 10 })).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.thesis.update).not.toHaveBeenCalled();
    });

    it('refuses to publish a thesis that is already published', async () => {
      prisma.thesis.findUnique.mockResolvedValue({ ...draftThesis, status: 'ACTIVE' });

      await expect(service.publish('thesis_1', 'author_1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changing the company on a draft', () => {
    it('resolves the new ticker and saves the new security', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      securities.findByTicker.mockResolvedValue({ id: 'sec_2', ticker: 'MTNN' });

      await service.updateDraft('thesis_1', 'author_1', { ticker: 'MTNN' });

      expect(securities.findByTicker).toHaveBeenCalledWith('MTNN');
      expect(prisma.thesis.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ securityId: 'sec_2' }) }),
      );
    });

    it('with an unknown ticker, fails before deleting metrics or writing anything', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      securities.findByTicker.mockRejectedValue(new NotFoundException('No security listed with ticker NOPE'));

      await expect(
        service.updateDraft('thesis_1', 'author_1', { ticker: 'NOPE', metrics: [] }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.thesisMetric.deleteMany).not.toHaveBeenCalled();
      expect(prisma.thesis.update).not.toHaveBeenCalled();
    });

    it('leaves the company alone when no ticker is sent', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);

      await service.updateDraft('thesis_1', 'author_1', { conviction: 7 });

      expect(securities.findByTicker).not.toHaveBeenCalled();
      expect(prisma.thesis.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ securityId: undefined }) }),
      );
    });
  });

  describe('ownership', () => {
    it('refuses to let someone edit a draft that belongs to someone else', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);

      await expect(service.updateDraft('thesis_1', 'a-different-author', { conviction: 10 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses to let someone publish a draft that belongs to someone else', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);

      await expect(service.publish('thesis_1', 'a-different-author')).rejects.toThrow(ForbiddenException);
      expect(prisma.thesis.update).not.toHaveBeenCalled();
    });
  });

  describe('reference price', () => {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    it('takes the reference price from the latest real market price, never from the caller', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      prisma.price.findFirst.mockResolvedValue({ price: '742.50', recordedAt: daysAgo(1) });
      prisma.thesis.update.mockResolvedValue({ ...draftThesis, status: 'ACTIVE', referencePrice: '742.50' });

      await service.publish('thesis_1', 'author_1');

      expect(prisma.price.findFirst).toHaveBeenCalledWith({
        where: { securityId: 'sec_1' },
        orderBy: { recordedAt: 'desc' },
      });
      const updateArg = prisma.thesis.update.mock.calls[0][0];
      expect(updateArg.data.referencePrice).toBe('742.50');
      expect(updateArg.data.status).toBe('ACTIVE');
    });

    it('refuses to publish when no real price has ever been recorded (only the seed placeholder)', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      prisma.price.findFirst.mockResolvedValue(null);

      await expect(service.publish('thesis_1', 'author_1')).rejects.toThrow(ConflictException);
      expect(prisma.thesis.update).not.toHaveBeenCalled();
    });

    it('refuses to publish when the latest real price is more than 7 days old', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      prisma.price.findFirst.mockResolvedValue({ price: '742.50', recordedAt: daysAgo(8) });

      await expect(service.publish('thesis_1', 'author_1')).rejects.toThrow(ConflictException);
      expect(prisma.thesis.update).not.toHaveBeenCalled();
    });

    it('still publishes across a long weekend or holiday (a price 6 days old)', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      prisma.price.findFirst.mockResolvedValue({ price: '742.50', recordedAt: daysAgo(6) });
      prisma.thesis.update.mockResolvedValue({ ...draftThesis, status: 'ACTIVE' });

      await service.publish('thesis_1', 'author_1');

      expect(prisma.thesis.update).toHaveBeenCalled();
    });
  });

  describe('draft privacy', () => {
    it('hides a draft from anyone who is not its author, as a 404 not a 403', async () => {
      prisma.thesis.findUnique.mockResolvedValue({ ...draftThesis, metrics: [], security: {} });

      await expect(service.findOne('thesis_1', 'a-different-author')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('thesis_1', undefined)).rejects.toThrow(NotFoundException);
    });

    it('lets the author see their own draft', async () => {
      const full = { ...draftThesis, metrics: [], security: {} };
      prisma.thesis.findUnique.mockResolvedValue(full);

      await expect(service.findOne('thesis_1', 'author_1')).resolves.toEqual(full);
    });

    it('is visible to anyone, including no one logged in, once published', async () => {
      const published = { ...draftThesis, status: 'ACTIVE', metrics: [], security: {} };
      prisma.thesis.findUnique.mockResolvedValue(published);

      await expect(service.findOne('thesis_1', undefined)).resolves.toEqual(published);
    });
  });
});
