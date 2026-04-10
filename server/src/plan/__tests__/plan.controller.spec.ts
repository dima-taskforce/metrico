import { Test, TestingModule } from '@nestjs/testing';
import { PlanController } from '../plan.controller';
import { PlanService } from '../plan.service';
import { GetPlanDto } from '../dto/get-plan.dto';
import type { JwtPayload } from '../../auth/decorators/current-user.decorator';

describe('PlanController', () => {
  let controller: PlanController;
  let service: PlanService;

  const mockUser: JwtPayload = { sub: 'user-1', email: 'test@example.com' };

  const mockFloorPlan: GetPlanDto = {
    projectId: 'proj-1',
    projectLabel: 'Demo Apartment',
    rooms: [
      {
        id: 'room-1',
        label: 'Living Room',
        ceilingHeight: 2.68,
        perimeter: 12.68,
        area: 10.0,
        volume: 26.8,
        curvatureMean: null,
        curvatureStdDev: null,
        walls: [
          {
            id: 'w1',
            roomId: 'room-1',
            label: 'A-B',
            length: 4000,
            sortOrder: 0,
            material: 'CONCRETE',
            wallType: 'EXTERNAL',
            segments: [],
            openings: [],
          },
        ],
        elements: [],
      },
    ],
    adjacencies: [],
    generatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanController],
      providers: [
        {
          provide: PlanService,
          useValue: {
            getFloorPlan: jest.fn(),
            saveFloorPlanLayout: jest.fn(),
            getFloorPlanLayout: jest.fn(),
            deleteFloorPlanLayout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PlanController>(PlanController);
    service = module.get<PlanService>(PlanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFloorPlan', () => {
    it('should return floor plan for valid project', async () => {
      (service.getFloorPlan as jest.Mock).mockResolvedValue(mockFloorPlan);

      const result = await controller.getFloorPlan('proj-1', mockUser);

      expect(result).toEqual(mockFloorPlan);
      expect(service.getFloorPlan).toHaveBeenCalledWith('proj-1', mockUser.sub);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Project not found');
      (service.getFloorPlan as jest.Mock).mockRejectedValue(error);

      await expect(controller.getFloorPlan('nonexistent', mockUser)).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('saveFloorPlanLayout', () => {
    it('should save layout and return id', async () => {
      const layoutJson = '{"rooms":[]}';
      const mockResponse = { id: 'layout-1', projectId: 'proj-1' };

      (service.saveFloorPlanLayout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.saveFloorPlanLayout(
        'proj-1',
        layoutJson,
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(service.saveFloorPlanLayout).toHaveBeenCalledWith(
        'proj-1',
        layoutJson,
        mockUser.sub,
      );
    });

    it('should pass through service validation errors', async () => {
      const error = new Error('Invalid JSON');
      (service.saveFloorPlanLayout as jest.Mock).mockRejectedValue(error);

      await expect(
        controller.saveFloorPlanLayout('proj-1', 'invalid', mockUser),
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('deleteFloorPlanLayout', () => {
    it('should delete layout and return undefined', async () => {
      (service.deleteFloorPlanLayout as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await controller.deleteFloorPlanLayout('proj-1', mockUser);

      expect(result).toBeUndefined();
      expect(service.deleteFloorPlanLayout).toHaveBeenCalledWith('proj-1', mockUser.sub);
    });

    it('should handle non-existent layouts gracefully', async () => {
      (service.deleteFloorPlanLayout as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await controller.deleteFloorPlanLayout('nonexistent', mockUser);

      expect(result).toBeUndefined();
    });
  });
});
