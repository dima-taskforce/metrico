import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnglesService } from '../angles.service';
import { PrismaService } from '../../prisma/prisma.service';

const NOW = new Date();

const makeAngle = (overrides = {}) => ({
  id: 'ang1',
  roomId: 'r1',
  cornerLabel: 'A',
  wallAId: 'w1',
  wallBId: 'w2',
  isRightAngle: false,
  angleDegrees: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeRoomWithAccess = (userId = 'u1') => ({
  id: 'r1',
  project: { userId },
});

const makePrisma = () => ({
  room: { findUnique: jest.fn() },
  angle: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('AnglesService', () => {
  let service: AnglesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnglesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AnglesService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all angles for a room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findMany.mockResolvedValue([makeAngle()]);

      const result = await service.findAll('r1', 'u1');
      expect(result).toHaveLength(1);
      expect(prisma.angle.findMany).toHaveBeenCalledWith({ where: { roomId: 'r1' } });
    });

    it('throws NotFoundException when room not found', async () => {
      prisma.room.findUnique.mockResolvedValue(null);
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a right angle', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      const angle = makeAngle({ isRightAngle: true, angleDegrees: 90 });
      prisma.angle.create.mockResolvedValue(angle);

      const dto = { cornerLabel: 'A', wallAId: 'w1', wallBId: 'w2', isRightAngle: true, angleDegrees: 90 };
      const result = await service.create('r1', 'u1', dto);

      expect(result.isRightAngle).toBe(true);
      expect(result.angleDegrees).toBe(90);
    });

    it('creates angle without optional fields', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.create.mockResolvedValue(makeAngle());

      const dto = { cornerLabel: 'B', wallAId: 'w1', wallBId: 'w2' };
      const result = await service.create('r1', 'u1', dto);

      expect(result.cornerLabel).toBe('A');
      expect(prisma.angle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomId: 'r1', cornerLabel: 'B', wallAId: 'w1', wallBId: 'w2' }),
        }),
      );
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      const dto = { cornerLabel: 'A', wallAId: 'w1', wallBId: 'w2' };
      await expect(service.create('r1', 'u1', dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates angle degrees', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findUnique.mockResolvedValue(makeAngle());
      prisma.angle.update.mockResolvedValue(makeAngle({ angleDegrees: 87.5 }));

      const result = await service.update('r1', 'ang1', 'u1', { angleDegrees: 87.5 });
      expect(result.angleDegrees).toBe(87.5);
    });

    it('throws NotFoundException when angle not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findUnique.mockResolvedValue(null);
      await expect(service.update('r1', 'ang1', 'u1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when angle belongs to different room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findUnique.mockResolvedValue(makeAngle({ roomId: 'other-room' }));
      await expect(service.update('r1', 'ang1', 'u1', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes an angle', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findUnique.mockResolvedValue(makeAngle());
      prisma.angle.delete.mockResolvedValue(makeAngle());

      await service.remove('r1', 'ang1', 'u1');
      expect(prisma.angle.delete).toHaveBeenCalledWith({ where: { id: 'ang1' } });
    });

    it('throws NotFoundException when angle not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.angle.findUnique.mockResolvedValue(null);
      await expect(service.remove('r1', 'ang1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
