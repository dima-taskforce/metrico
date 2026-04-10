import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdjacencyService } from '../adjacency.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';

describe('AdjacencyService', () => {
  let service: AdjacencyService;
  let prisma: PrismaService;

  const mockWallA = {
    id: 'wall-a-id',
    roomId: 'room-1-id',
    length: 4000,
    room: { projectId: 'project-id' },
  };

  const mockWallB = {
    id: 'wall-b-id',
    roomId: 'room-2-id',
    length: 3000,
    room: { projectId: 'project-id' },
  };

  const mockDoorOpening = {
    id: 'door-id',
    wallId: 'wall-a-id',
    width: 900,
    heightFromScreed: 2000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjacencyService,
        {
          provide: PrismaService,
          useValue: {
            wall: {
              findUnique: jest.fn(),
            },
            wallAdjacency: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            doorOpening: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'project-id' }),
          },
        },
      ],
    }).compile();

    service = module.get<AdjacencyService>(AdjacencyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create adjacency with door', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: true,
        doorOpeningId: 'door-id',
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(mockWallB);
      (prisma.wallAdjacency.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.doorOpening.findUnique as jest.Mock).mockResolvedValue(mockDoorOpening);
      (prisma.wallAdjacency.create as jest.Mock).mockResolvedValue({
        id: 'adj-id',
        ...dto,
        projectId: 'project-id',
      });

      const result = await service.create('project-id', dto, 'user-id');
      expect(result).toBeDefined();
      expect(prisma.wallAdjacency.create).toHaveBeenCalled();
    });

    it('should reject walls from same room', async () => {
      const wallSameRoom = { ...mockWallA, roomId: 'room-1-id' };
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: false,
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(wallSameRoom);

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate adjacency (A,B)', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: false,
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(mockWallB);
      (prisma.wallAdjacency.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' }) // existing direct
        .mockResolvedValueOnce(null);

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject duplicate adjacency reverse (B,A)', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: false,
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(mockWallB);
      (prisma.wallAdjacency.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // no direct
        .mockResolvedValueOnce({ id: 'existing-reverse' }); // existing reverse

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject hasDoorBetween=true without doorOpeningId', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: true,
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(mockWallB);
      (prisma.wallAdjacency.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-existent wall', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: false,
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject non-existent door opening', async () => {
      const dto = {
        wallAId: 'wall-a-id',
        wallBId: 'wall-b-id',
        hasDoorBetween: true,
        doorOpeningId: 'nonexistent-door',
      };

      (prisma.wall.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockWallA)
        .mockResolvedValueOnce(mockWallB);
      (prisma.wallAdjacency.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.doorOpening.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.create('project-id', dto, 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByProject', () => {
    it('should return adjacencies for project', async () => {
      const mockAdjacencies = [
        { id: 'adj-1', wallAId: 'wall-a-id', wallBId: 'wall-b-id' },
      ];
      (prisma.wallAdjacency.findMany as jest.Mock).mockResolvedValue(
        mockAdjacencies,
      );

      const result = await service.findByProject('project-id', 'user-id');
      expect(result).toEqual(mockAdjacencies);
      expect(prisma.wallAdjacency.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete adjacency', async () => {
      const mockAdj = { id: 'adj-id', projectId: 'project-id' };
      (prisma.wallAdjacency.findUnique as jest.Mock).mockResolvedValue(mockAdj);
      (prisma.wallAdjacency.delete as jest.Mock).mockResolvedValue(mockAdj);

      await service.delete('adj-id', 'project-id', 'user-id');
      expect(prisma.wallAdjacency.delete).toHaveBeenCalledWith({
        where: { id: 'adj-id' },
      });
    });

    it('should reject non-existent adjacency', async () => {
      (prisma.wallAdjacency.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent-id', 'project-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
