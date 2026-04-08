import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { WallMaterial, WallType } from '@prisma/client';
import { WallsService } from '../walls.service';
import { PrismaService } from '../../prisma/prisma.service';

const NOW = new Date();

const makeWall = (overrides = {}) => ({
  id: 'w1',
  roomId: 'r1',
  label: 'A-B',
  cornerFrom: 'A',
  cornerTo: 'B',
  length: 4.2,
  sortOrder: 0,
  material: WallMaterial.CONCRETE,
  wallType: WallType.EXTERNAL,
  curvatureBottom: null,
  curvatureMiddle: null,
  curvatureTop: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeRoomWithAccess = (userId = 'u1') => ({
  id: 'r1',
  project: { userId },
});

const makeWallWithAccess = (userId = 'u1') => ({
  ...makeWall(),
  room: { project: { userId } },
});

const makePrisma = () => ({
  room: { findUnique: jest.fn() },
  wall: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('WallsService', () => {
  let service: WallsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WallsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(WallsService);
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns walls for the room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.findMany.mockResolvedValue([makeWall()]);

      const result = await service.findAll('r1', 'u1');
      expect(result).toHaveLength(1);
      expect(prisma.wall.findMany).toHaveBeenCalledWith({
        where: { roomId: 'r1' },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('throws NotFoundException when room not found', async () => {
      prisma.room.findUnique.mockResolvedValue(null);
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when room belongs to other user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      await expect(service.findAll('r1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a wall by id', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.findUnique.mockResolvedValue(makeWall());

      const result = await service.findOne('r1', 'w1', 'u1');
      expect(result.id).toBe('w1');
    });

    it('throws NotFoundException when wall not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.findUnique.mockResolvedValue(null);
      await expect(service.findOne('r1', 'w1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when wall belongs to different room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.findUnique.mockResolvedValue(makeWall({ roomId: 'other-room' }));
      await expect(service.findOne('r1', 'w1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a wall with auto-generated label', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.create.mockResolvedValue(makeWall({ label: 'A-B' }));

      const dto = { cornerFrom: 'A', cornerTo: 'B', length: 4.2, sortOrder: 0 };
      const result = await service.create('r1', 'u1', dto);

      expect(result.label).toBe('A-B');
      expect(prisma.wall.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ label: 'A-B', roomId: 'r1' }) }),
      );
    });

    it('uses provided label when given', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.wall.create.mockResolvedValue(makeWall({ label: 'Custom' }));

      const dto = { cornerFrom: 'A', cornerTo: 'B', length: 4.2, sortOrder: 0, label: 'Custom' };
      await service.create('r1', 'u1', dto);

      expect(prisma.wall.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ label: 'Custom' }) }),
      );
    });

    it('creates wall with curvature values', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      const wallWithCurvature = makeWall({ curvatureBottom: 0.01, curvatureTop: 0.02 });
      prisma.wall.create.mockResolvedValue(wallWithCurvature);

      const dto = { cornerFrom: 'A', cornerTo: 'B', length: 4.2, sortOrder: 0, curvatureBottom: 0.01, curvatureTop: 0.02 };
      const result = await service.create('r1', 'u1', dto);

      expect(result.curvatureBottom).toBe(0.01);
    });

    it('throws ForbiddenException when room belongs to other user', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess('other'));
      const dto = { cornerFrom: 'A', cornerTo: 'B', length: 4.2, sortOrder: 0 };
      await expect(service.create('r1', 'u1', dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates wall length', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.wall.update.mockResolvedValue(makeWall({ length: 5.0 }));

      const result = await service.update('w1', 'u1', { length: 5.0 });
      expect(result.length).toBe(5.0);
    });

    it('auto-updates label when cornerFrom changes', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.wall.update.mockResolvedValue(makeWall({ label: 'X-B', cornerFrom: 'X' }));

      await service.update('w1', 'u1', { cornerFrom: 'X' });

      expect(prisma.wall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ label: 'X-B' }),
        }),
      );
    });

    it('throws NotFoundException when wall not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(null);
      await expect(service.update('w1', 'u1', { length: 5.0 })).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess('other'));
      await expect(service.update('w1', 'u1', { length: 5.0 })).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes a wall', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.wall.delete.mockResolvedValue(makeWall());

      await service.remove('w1', 'u1');
      expect(prisma.wall.delete).toHaveBeenCalledWith({ where: { id: 'w1' } });
    });

    it('throws NotFoundException when wall not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(null);
      await expect(service.remove('w1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
