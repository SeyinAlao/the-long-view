import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CounterThesesService } from './counter-theses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CounterThesesService', () => {
  let service: CounterThesesService;
  let prisma: { thesis: { findUnique: jest.Mock }; counterThesis: { create: jest.Mock } };

  const publishedThesis = { id: 'thesis_1', authorId: 'original_author', status: 'ACTIVE' };
  const validCounter = {
    targetPrice: 900,
    conviction: 6,
    horizonDays: 90,
    reasoning: 'The market has already priced in most of the upside here, and margin pressure from input costs looks understated in the current numbers.',
  };

  beforeEach(() => {
    prisma = { thesis: { findUnique: jest.fn() }, counterThesis: { create: jest.fn() } };
    service = new CounterThesesService(prisma as unknown as PrismaService);
  });

  it('refuses to counter a thesis that does not exist', async () => {
    prisma.thesis.findUnique.mockResolvedValue(null);

    await expect(service.create('thesis_1', 'someone', validCounter)).rejects.toThrow(NotFoundException);
  });

  it('refuses to counter a thesis that is still a draft, as a 404 not a 403', async () => {
    prisma.thesis.findUnique.mockResolvedValue({ ...publishedThesis, status: 'DRAFT' });

    await expect(service.create('thesis_1', 'someone', validCounter)).rejects.toThrow(NotFoundException);
    expect(prisma.counterThesis.create).not.toHaveBeenCalled();
  });

  it('refuses to let someone counter their own thesis', async () => {
    prisma.thesis.findUnique.mockResolvedValue(publishedThesis);

    await expect(service.create('thesis_1', 'original_author', validCounter)).rejects.toThrow(ForbiddenException);
    expect(prisma.counterThesis.create).not.toHaveBeenCalled();
  });

  it('creates a real counter-thesis, immediately published, for a legitimate disagreement', async () => {
    prisma.thesis.findUnique.mockResolvedValue(publishedThesis);
    prisma.counterThesis.create.mockResolvedValue({ id: 'counter_1', ...validCounter });

    const result = await service.create('thesis_1', 'a_different_author', validCounter);

    expect(prisma.counterThesis.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ thesisId: 'thesis_1', authorId: 'a_different_author' }),
      }),
    );
    expect(result.id).toBe('counter_1');
  });

  it('turns a database-level duplicate (the unique constraint actually firing) into a clean, readable error', async () => {
    prisma.thesis.findUnique.mockResolvedValue(publishedThesis);
    prisma.counterThesis.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.create('thesis_1', 'a_different_author', validCounter)).rejects.toThrow(
      ConflictException,
    );
  });
});
