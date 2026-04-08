import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ObjectType, ProjectStatus } from '@prisma/client';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FileStorageService } from '../../storage/file-storage.service';

const NOW = new Date();

const makeProject = (overrides = {}) => ({
  id: 'p1',
  userId: 'u1',
  name: 'Test',
  address: null,
  objectType: ObjectType.APARTMENT,
  defaultCeilingHeight: null,
  status: ProjectStatus.DRAFT,
  blueprintPhotoPath: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makePrisma = () => ({
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

const makeStorage = () => ({
  save: jest.fn(),
  delete: jest.fn(),
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: ReturnType<typeof makePrisma>;
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(async () => {
    prisma = makePrisma();
    storage = makeStorage();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileStorageService, useValue: storage },
      ],
    }).compile();
    service = module.get(ProjectsService);
  });

  describe('findAll', () => {
    it('returns projects for the user', async () => {
      const projects = [makeProject()];
      prisma.project.findMany.mockResolvedValue(projects);
      const result = await service.findAll('u1');
      expect(result).toEqual(projects);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns project for owner', async () => {
      prisma.project.findUnique.mockResolvedValue(makeProject());
      const result = await service.findOne('p1', 'u1');
      expect(result.id).toBe('p1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findOne('p1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for wrong user', async () => {
      prisma.project.findUnique.mockResolvedValue(makeProject({ userId: 'u2' }));
      await expect(service.findOne('p1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates and returns project', async () => {
      const project = makeProject();
      prisma.project.create.mockResolvedValue(project);
      const result = await service.create('u1', {
        name: 'Test',
        objectType: ObjectType.APARTMENT,
      });
      expect(result).toEqual(project);
    });
  });

  describe('remove', () => {
    it('deletes project and blueprint file', async () => {
      prisma.project.findUnique.mockResolvedValue(
        makeProject({ blueprintPhotoPath: 'uploads/p1/blueprint/file.jpg' }),
      );
      storage.delete.mockResolvedValue(undefined);
      prisma.project.delete.mockResolvedValue(makeProject());
      await service.remove('p1', 'u1');
      expect(storage.delete).toHaveBeenCalledWith('uploads/p1/blueprint/file.jpg');
      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });

  describe('duplicate', () => {
    it('creates a copy with "(копия)" suffix', async () => {
      prisma.project.findUnique.mockResolvedValue(makeProject({ name: 'Квартира' }));
      prisma.project.create.mockResolvedValue(makeProject({ name: 'Квартира (копия)' }));
      const result = await service.duplicate('p1', 'u1');
      expect(result.name).toContain('копия');
    });
  });
});
