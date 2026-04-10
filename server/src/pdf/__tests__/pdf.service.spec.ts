import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PdfGeneratorService } from '../pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanService } from '../../plan/plan.service';
import type { GetPlanDto } from '../../plan/dto/get-plan.dto';

const mockPlan: GetPlanDto = {
  projectId: 'proj-1',
  projectLabel: 'Тестовый проект',
  generatedAt: new Date('2026-04-09'),
  adjacencies: [],
  rooms: [
    {
      id: 'room-1',
      label: 'Гостиная',
      perimeter: 14000,
      area: 12250000,
      volume: 33075000,
      ceilingHeight: 2.7,
      curvatureMean: null,
      curvatureStdDev: null,
      walls: [
        {
          id: 'w1', roomId: 'room-1', label: 'Стена 1', length: 4500,
          material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 0, segments: [], openings: [],
        },
        {
          id: 'w2', roomId: 'room-1', label: 'Стена 2', length: 2500,
          material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 1, segments: [], openings: [],
        },
        {
          id: 'w3', roomId: 'room-1', label: 'Стена 3', length: 4500,
          material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 2, segments: [], openings: [],
        },
        {
          id: 'w4', roomId: 'room-1', label: 'Стена 4', length: 2500,
          material: 'CONCRETE', wallType: 'EXTERNAL', sortOrder: 3, segments: [], openings: [],
        },
      ],
      elements: [
        { id: 'el1', label: 'Электрощит', elementType: 'ELECTRICAL_PANEL', depth: 0, x: 200, y: 0 },
        { id: 'el2', label: 'Радиатор', elementType: 'RADIATOR', depth: 0, x: 2000, y: 0 },
      ],
    },
    {
      id: 'room-2',
      label: 'Спальня',
      perimeter: 11200,
      area: 7840000,
      volume: 21168000,
      ceilingHeight: 2.7,
      curvatureMean: null,
      curvatureStdDev: null,
      walls: [
        {
          id: 'w5', roomId: 'room-2', label: 'Стена 1', length: 3500,
          material: 'DRYWALL', wallType: 'INTERNAL', sortOrder: 0, segments: [], openings: [],
        },
        {
          id: 'w6', roomId: 'room-2', label: 'Стена 2', length: 2100,
          material: 'DRYWALL', wallType: 'INTERNAL', sortOrder: 1, segments: [], openings: [],
        },
        {
          id: 'w7', roomId: 'room-2', label: 'Стена 3', length: 3500,
          material: 'DRYWALL', wallType: 'INTERNAL', sortOrder: 2, segments: [], openings: [],
        },
        {
          id: 'w8', roomId: 'room-2', label: 'Стена 4', length: 2100,
          material: 'DRYWALL', wallType: 'INTERNAL', sortOrder: 3, segments: [], openings: [],
        },
      ],
      elements: [],
    },
  ],
};

const mockProject = {
  id: 'proj-1',
  name: 'Тестовый проект',
  address: 'ул. Тестовая, д. 1',
  status: 'COMPLETED',
};

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let prisma: { project: { findUnique: jest.Mock } };
  let planService: { getFloorPlan: jest.Mock };

  beforeEach(async () => {
    prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue(mockProject),
      },
    };
    planService = {
      getFloorPlan: jest.fn().mockResolvedValue(mockPlan),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGeneratorService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlanService, useValue: planService },
      ],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  it('generates a non-empty PDF buffer', async () => {
    const buffer = await service.generateProjectPdf('proj-1', 'user-id');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('starts with PDF magic bytes %PDF', async () => {
    const buffer = await service.generateProjectPdf('proj-1', 'user-id');
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates PDF larger than 2KB', async () => {
    const buffer = await service.generateProjectPdf('proj-1', 'user-id');
    expect(buffer.length).toBeGreaterThan(2048);
  });

  it('throws NotFoundException when project does not exist', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.generateProjectPdf('nonexistent', 'user-id')).rejects.toThrow(NotFoundException);
  });

  it('calls getFloorPlan with the correct projectId', async () => {
    await service.generateProjectPdf('proj-1', 'user-id');
    expect(planService.getFloorPlan).toHaveBeenCalledWith('proj-1', 'user-id');
  });

  it('generates PDF for project with no address', async () => {
    prisma.project.findUnique.mockResolvedValue({ ...mockProject, address: null });
    const buffer = await service.generateProjectPdf('proj-1', 'user-id');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('generates PDF for project with empty rooms', async () => {
    planService.getFloorPlan.mockResolvedValue({ ...mockPlan, rooms: [] });
    const buffer = await service.generateProjectPdf('proj-1', 'user-id');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('throws BadRequestException for DRAFT project', async () => {
    prisma.project.findUnique.mockResolvedValue({ ...mockProject, status: 'DRAFT' });
    await expect(service.generateProjectPdf('proj-1', 'user-id')).rejects.toThrow(BadRequestException);
  });
});
