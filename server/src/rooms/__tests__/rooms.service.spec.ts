import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomType, RoomShape } from '@prisma/client';
import { RoomsService } from '../rooms.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';

const NOW = new Date();

const makeRoom = (overrides = {}) => ({
  id: 'r1',
  projectId: 'p1',
  name: 'Кухня',
  type: RoomType.KITCHEN,
  shape: RoomShape.RECTANGLE,
  ceilingHeight1: null,
  ceilingHeight2: null,
  sortOrder: 0,
  isMeasured: false,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeProject = () => ({ id: 'p1', userId: 'u1' });

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: {
    room: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let projectsService: { findOne: jest.Mock };

  beforeEach(async () => {
    prisma = {
      room: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    projectsService = { findOne: jest.fn().mockResolvedValue(makeProject()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();
    service = module.get(RoomsService);
  });

  describe('findAll', () => {
    it('returns rooms ordered by sortOrder', async () => {
      prisma.room.findMany.mockResolvedValue([makeRoom()]);
      const result = await service.findAll('p1', 'u1');
      expect(result).toHaveLength(1);
      expect(projectsService.findOne).toHaveBeenCalledWith('p1', 'u1');
    });
  });

  describe('findOne', () => {
    it('returns room when found', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoom());
      const result = await service.findOne('p1', 'r1', 'u1');
      expect(result.id).toBe('r1');
    });

    it('throws NotFoundException when room not found', async () => {
      prisma.room.findUnique.mockResolvedValue(null);
      await expect(service.findOne('p1', 'r1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when room belongs to different project', async () => {
      prisma.room.findUnique.mockResolvedValue(makeRoom({ projectId: 'p2' }));
      await expect(service.findOne('p1', 'r1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates room', async () => {
      prisma.room.create.mockResolvedValue(makeRoom());
      const result = await service.create('p1', 'u1', {
        name: 'Кухня',
        type: RoomType.KITCHEN,
        shape: RoomShape.RECTANGLE,
        sortOrder: 0,
      });
      expect(result.id).toBe('r1');
    });
  });

  describe('reorder', () => {
    it('throws BadRequestException for unknown room id', async () => {
      prisma.room.findMany.mockResolvedValue([makeRoom({ id: 'r1' })]);
      await expect(
        service.reorder('p1', 'u1', { orderedIds: ['r1', 'r999'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates sortOrder for all rooms in transaction', async () => {
      prisma.room.findMany
        .mockResolvedValueOnce([makeRoom({ id: 'r1' }), makeRoom({ id: 'r2', sortOrder: 1 })])
        .mockResolvedValueOnce([makeRoom({ id: 'r2' }), makeRoom({ id: 'r1', sortOrder: 1 })]);
      prisma.$transaction.mockResolvedValue([]);
      await service.reorder('p1', 'u1', { orderedIds: ['r2', 'r1'] });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
