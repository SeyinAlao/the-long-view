import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ThesesService } from './theses.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecuritiesService } from '../securities/securities.service';

describe('ThesesService', () => {
  let service: ThesesService;
  let prisma: {
    thesis: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    security: { findUnique: jest.Mock };
    thesisMetric: { deleteMany: jest.Mock };
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
      thesisMetric: { deleteMany: jest.fn() },
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
    it('takes the reference price from the security, never from the caller', async () => {
      prisma.thesis.findUnique.mockResolvedValue(draftThesis);
      prisma.security.findUnique.mockResolvedValue({ id: 'sec_1', currentPrice: '742.50' });
      prisma.thesis.update.mockResolvedValue({ ...draftThesis, status: 'ACTIVE', referencePrice: '742.50' });

      await service.publish('thesis_1', 'author_1');

      const updateArg = prisma.thesis.update.mock.calls[0][0];
      expect(updateArg.data.referencePrice).toBe('742.50');
      expect(updateArg.data.status).toBe('ACTIVE');
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
