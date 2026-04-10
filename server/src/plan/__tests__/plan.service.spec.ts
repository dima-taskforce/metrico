import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlanService } from '../plan.service';
import { PlanAssemblerService } from '../plan-assembler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';

describe('PlanService', () => {
  let service: PlanService;
  let prisma: PrismaService;
  let assembler: PlanAssemblerService;
  let projectsService: { findOne: jest.Mock; updateStatus: jest.Mock };

  const mockProject = {
    id: 'proj-1',
    label: 'Demo Apartment',
    rooms: [
      {
        id: 'room-1',
        label: 'Living Room',
        projectId: 'proj-1',
        ceilingHeight: 2.68,
        walls: [
          {
            id: 'w1',
            label: 'A-B',
            roomId: 'room-1',
            length: 4000,
            sortOrder: 0,
            material: 'CONCRETE',
            wallType: 'EXTERNAL',
            curvatureBottom: null,
            curvatureMiddle: null,
            curvatureTop: null,
            segments: [],
            windows: [],
            doors: [],
          },
        ],
        elements: [],
      },
    ],
  };

  const mockLayout = {
    id: 'layout-1',
    projectId: 'proj-1',
    layoutJson: '{"rooms":[]}',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: jest.fn(),
            },
            angle: {
              findMany: jest.fn(),
            },
            wallAdjacency: {
              findMany: jest.fn(),
            },
            floorPlanLayout: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: PlanAssemblerService,
          useValue: {
            assembleFloorPlan: jest.fn(),
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'proj-1' }),
            updateStatus: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PlanService>(PlanService);
    prisma = module.get<PrismaService>(PrismaService);
    assembler = module.get<PlanAssemblerService>(PlanAssemblerService);
    projectsService = module.get(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFloorPlan', () => {
    it('should assemble and return floor plan for valid project', async () => {
      const mockFloorPlan = {
        projectId: 'proj-1',
        projectLabel: 'Demo Apartment',
        rooms: [],
        adjacencies: [],
        generatedAt: new Date(),
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.angle.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.wallAdjacency.findMany as jest.Mock).mockResolvedValue([]);
      (assembler.assembleFloorPlan as jest.Mock).mockReturnValue(mockFloorPlan);

      const result = await service.getFloorPlan('proj-1', 'user-id');

      expect(result).toEqual(mockFloorPlan);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        include: expect.any(Object),
      });
      expect(assembler.assembleFloorPlan).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getFloorPlan('nonexistent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set project status to COMPLETED after successful assembly', async () => {
      const mockFloorPlan = {
        projectId: 'proj-1',
        projectLabel: 'Demo Apartment',
        rooms: [],
        adjacencies: [],
        generatedAt: new Date(),
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.angle.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.wallAdjacency.findMany as jest.Mock).mockResolvedValue([]);
      (assembler.assembleFloorPlan as jest.Mock).mockReturnValue(mockFloorPlan);

      await service.getFloorPlan('proj-1', 'user-id');
      expect(projectsService.updateStatus).toHaveBeenCalledWith('proj-1', 'COMPLETED');
    });

    it('should include angles and adjacencies in assembly', async () => {
      const mockAngles = [{ id: 'a1', roomId: 'room-1', isRightAngle: true }];
      const mockAdj = [{ id: 'adj-1', wallAId: 'w1', wallBId: 'w2' }];

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.angle.findMany as jest.Mock).mockResolvedValue(mockAngles);
      (prisma.wallAdjacency.findMany as jest.Mock).mockResolvedValue(mockAdj);
      (assembler.assembleFloorPlan as jest.Mock).mockReturnValue({
        projectId: 'proj-1',
        projectLabel: 'Demo Apartment',
        rooms: [],
        adjacencies: [],
        generatedAt: new Date(),
      });

      await service.getFloorPlan('proj-1', 'user-id');

      expect(prisma.angle.findMany).toHaveBeenCalledWith({
        where: {
          room: { projectId: 'proj-1' },
        },
      });
      expect(prisma.wallAdjacency.findMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        include: expect.any(Object),
      });
    });
  });

  describe('saveFloorPlanLayout', () => {
    it('should upsert floor plan layout with valid JSON', async () => {
      const validJson = '{"rooms":[],"walls":[]}';
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.floorPlanLayout.upsert as jest.Mock).mockResolvedValue(mockLayout);

      const result = await service.saveFloorPlanLayout('proj-1', validJson, 'user-id');

      expect(result).toEqual({ id: 'layout-1', projectId: 'proj-1' });
      expect(prisma.floorPlanLayout.upsert).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
        update: { layoutJson: validJson },
        create: {
          projectId: 'proj-1',
          layoutJson: validJson,
        },
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      projectsService.findOne.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.saveFloorPlanLayout('nonexistent', '{}', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid JSON', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(
        service.saveFloorPlanLayout('proj-1', 'invalid json', 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFloorPlanLayout', () => {
    it('should return layout JSON when layout exists', async () => {
      (prisma.floorPlanLayout.findUnique as jest.Mock).mockResolvedValue(mockLayout);

      const result = await service.getFloorPlanLayout('proj-1');

      expect(result).toBe('{"rooms":[]}');
      expect(prisma.floorPlanLayout.findUnique).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });

    it('should return null when layout not found', async () => {
      (prisma.floorPlanLayout.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getFloorPlanLayout('proj-1');

      expect(result).toBeNull();
    });
  });

  describe('deleteFloorPlanLayout', () => {
    it('should delete layout when it exists', async () => {
      (prisma.floorPlanLayout.findUnique as jest.Mock).mockResolvedValue(mockLayout);
      (prisma.floorPlanLayout.delete as jest.Mock).mockResolvedValue(mockLayout);

      await service.deleteFloorPlanLayout('proj-1', 'user-id');

      expect(prisma.floorPlanLayout.delete).toHaveBeenCalledWith({
        where: { id: 'layout-1' },
      });
    });

    it('should not error when layout does not exist', async () => {
      (prisma.floorPlanLayout.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteFloorPlanLayout('proj-1', 'user-id'),
      ).resolves.toBeUndefined();

      expect(prisma.floorPlanLayout.delete).not.toHaveBeenCalled();
    });
  });
});
