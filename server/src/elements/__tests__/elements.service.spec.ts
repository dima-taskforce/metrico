import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ElementType } from '@prisma/client';
import { ElementsService } from '../elements.service';
import { PrismaService } from '../../prisma/prisma.service';

const NOW = new Date();

const makeElement = (overrides = {}) => ({
  id: 'el1',
  roomId: 'r1',
  elementType: ElementType.RADIATOR,
  width: null,
  height: null,
  depth: null,
  positionX: null,
  offsetFromWall: null,
  offsetFromFloor: null,
  wallId: null,
  cornerLabel: null,
  description: null,
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
  roomElement: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('ElementsService', () => {
  let service: ElementsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElementsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ElementsService);
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all room elements', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findMany.mockResolvedValue([makeElement()]);

      const result = await service.findAll('r1', 'u1');
      expect(result).toHaveLength(1);
      expect(prisma.roomElement.findMany).toHaveBeenCalledWith({ where: { roomId: 'r1' } });
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
    it('creates a RADIATOR element', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      const el = makeElement({ elementType: ElementType.RADIATOR, width: 800, height: 500 });
      prisma.roomElement.create.mockResolvedValue(el);

      const dto = { elementType: ElementType.RADIATOR, width: 800, height: 500 };
      const result = await service.create('r1', 'u1', dto);

      expect(result.elementType).toBe(ElementType.RADIATOR);
      expect(prisma.roomElement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ roomId: 'r1' }) }),
      );
    });

    it('creates a COLUMN element with cornerLabel', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      const el = makeElement({ elementType: ElementType.COLUMN, cornerLabel: 'A' });
      prisma.roomElement.create.mockResolvedValue(el);

      const dto = { elementType: ElementType.COLUMN, cornerLabel: 'A' };
      const result = await service.create('r1', 'u1', dto);

      expect(result.cornerLabel).toBe('A');
    });

    it('creates a VENT_SHAFT element with depth', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      const el = makeElement({ elementType: ElementType.VENT_SHAFT, depth: 300 });
      prisma.roomElement.create.mockResolvedValue(el);

      const dto = { elementType: ElementType.VENT_SHAFT, depth: 300 };
      const result = await service.create('r1', 'u1', dto);

      expect(result.depth).toBe(300);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates element dimensions', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findUnique.mockResolvedValue(makeElement());
      prisma.roomElement.update.mockResolvedValue(makeElement({ width: 1000 }));

      const result = await service.update('r1', 'el1', 'u1', { width: 1000 });
      expect(result.width).toBe(1000);
    });

    it('throws NotFoundException when element not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findUnique.mockResolvedValue(null);
      await expect(service.update('r1', 'el1', 'u1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when element belongs to different room', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findUnique.mockResolvedValue(makeElement({ roomId: 'other-room' }));
      await expect(service.update('r1', 'el1', 'u1', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('deletes an element', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findUnique.mockResolvedValue(makeElement());
      prisma.roomElement.delete.mockResolvedValue(makeElement());

      await service.remove('r1', 'el1', 'u1');
      expect(prisma.roomElement.delete).toHaveBeenCalledWith({ where: { id: 'el1' } });
    });

    it('throws NotFoundException when element not found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoomWithAccess());
      prisma.roomElement.findUnique.mockResolvedValue(null);
      await expect(service.remove('r1', 'el1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });
});
