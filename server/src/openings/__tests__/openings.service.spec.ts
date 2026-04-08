import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { OpeningsService } from '../openings.service';
import { PrismaService } from '../../prisma/prisma.service';

const NOW = new Date();

const makeWindow = (overrides = {}) => ({
  id: 'win1',
  wallId: 'w1',
  width: 1200,
  height: 1400,
  sillHeightFromScreed: 900,
  revealWidthLeft: null,
  revealWidthRight: null,
  isFrenchDoor: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeDoor = (overrides = {}) => ({
  id: 'door1',
  wallId: 'w1',
  width: 900,
  heightFromScreed: 2100,
  revealLeft: null,
  revealRight: null,
  isFrenchDoor: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeWallWithAccess = (userId = 'u1') => ({
  id: 'w1',
  room: { project: { userId } },
});

const makePrisma = () => ({
  wall: { findUnique: jest.fn() },
  windowOpening: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  doorOpening: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('OpeningsService', () => {
  let service: OpeningsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpeningsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OpeningsService);
  });

  // ── Windows ──────────────────────────────────────────────────────────────

  describe('findAllWindows', () => {
    it('returns windows for the wall', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.findMany.mockResolvedValue([makeWindow()]);

      const result = await service.findAllWindows('w1', 'u1');
      expect(result).toHaveLength(1);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess('other'));
      await expect(service.findAllWindows('w1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when wall not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(null);
      await expect(service.findAllWindows('w1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createWindow', () => {
    it('creates a window opening', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.create.mockResolvedValue(makeWindow());

      const dto = { width: 1200, height: 1400, sillHeightFromScreed: 900 };
      const result = await service.createWindow('w1', 'u1', dto);

      expect(result.width).toBe(1200);
      expect(prisma.windowOpening.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ wallId: 'w1' }) }),
      );
    });
  });

  describe('updateWindow', () => {
    it('updates window height', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.findUnique.mockResolvedValue(makeWindow());
      prisma.windowOpening.update.mockResolvedValue(makeWindow({ height: 1600 }));

      const result = await service.updateWindow('w1', 'win1', 'u1', { height: 1600 });
      expect(result.height).toBe(1600);
    });

    it('throws NotFoundException when window not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.findUnique.mockResolvedValue(null);
      await expect(service.updateWindow('w1', 'win1', 'u1', { height: 1600 })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when window belongs to different wall', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.findUnique.mockResolvedValue(makeWindow({ wallId: 'other-wall' }));
      await expect(service.updateWindow('w1', 'win1', 'u1', { height: 1600 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeWindow', () => {
    it('deletes a window', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.windowOpening.findUnique.mockResolvedValue(makeWindow());
      prisma.windowOpening.delete.mockResolvedValue(makeWindow());

      await service.removeWindow('w1', 'win1', 'u1');
      expect(prisma.windowOpening.delete).toHaveBeenCalledWith({ where: { id: 'win1' } });
    });
  });

  // ── Doors ────────────────────────────────────────────────────────────────

  describe('findAllDoors', () => {
    it('returns doors for the wall', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.findMany.mockResolvedValue([makeDoor()]);

      const result = await service.findAllDoors('w1', 'u1');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when wall not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(null);
      await expect(service.findAllDoors('w1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDoor', () => {
    it('creates a door opening', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.create.mockResolvedValue(makeDoor());

      const dto = { width: 900, heightFromScreed: 2100 };
      const result = await service.createDoor('w1', 'u1', dto);

      expect(result.width).toBe(900);
      expect(prisma.doorOpening.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ wallId: 'w1' }) }),
      );
    });
  });

  describe('updateDoor', () => {
    it('updates door height', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.findUnique.mockResolvedValue(makeDoor());
      prisma.doorOpening.update.mockResolvedValue(makeDoor({ heightFromScreed: 2200 }));

      const result = await service.updateDoor('w1', 'door1', 'u1', { heightFromScreed: 2200 });
      expect(result.heightFromScreed).toBe(2200);
    });

    it('throws NotFoundException when door belongs to different wall', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.findUnique.mockResolvedValue(makeDoor({ wallId: 'other-wall' }));
      await expect(service.updateDoor('w1', 'door1', 'u1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDoor', () => {
    it('deletes a door', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.findUnique.mockResolvedValue(makeDoor());
      prisma.doorOpening.delete.mockResolvedValue(makeDoor());

      await service.removeDoor('w1', 'door1', 'u1');
      expect(prisma.doorOpening.delete).toHaveBeenCalledWith({ where: { id: 'door1' } });
    });

    it('throws NotFoundException when door not found', async () => {
      prisma.wall.findUnique.mockResolvedValue(makeWallWithAccess());
      prisma.doorOpening.findUnique.mockResolvedValue(null);
      await expect(service.removeDoor('w1', 'door1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
