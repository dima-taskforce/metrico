import { Test, TestingModule } from '@nestjs/testing';
import { AdjacencyController } from '../adjacency.controller';
import { AdjacencyService } from '../adjacency.service';

describe('AdjacencyController', () => {
  let controller: AdjacencyController;
  let service: AdjacencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdjacencyController],
      providers: [
        {
          provide: AdjacencyService,
          useValue: {
            create: jest.fn(),
            findByProject: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AdjacencyController>(AdjacencyController);
    service = module.get<AdjacencyService>(AdjacencyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = {
        wallAId: 'wall-a',
        wallBId: 'wall-b',
        hasDoorBetween: false,
      };
      const result = { id: 'adj-1', ...dto };
      (service.create as jest.Mock).mockResolvedValue(result);

      const res = await controller.create('project-1', dto);
      expect(res).toEqual(result);
      expect(service.create).toHaveBeenCalledWith('project-1', dto);
    });
  });

  describe('findByProject', () => {
    it('should call service.findByProject', async () => {
      const mockAdjs = [{ id: 'adj-1' }];
      (service.findByProject as jest.Mock).mockResolvedValue(mockAdjs);

      const res = await controller.findByProject('project-1');
      expect(res).toEqual(mockAdjs);
      expect(service.findByProject).toHaveBeenCalledWith('project-1');
    });
  });

  describe('delete', () => {
    it('should call service.delete', async () => {
      (service.delete as jest.Mock).mockResolvedValue(undefined);

      await controller.delete('adj-1');
      expect(service.delete).toHaveBeenCalledWith('adj-1');
    });
  });
});
