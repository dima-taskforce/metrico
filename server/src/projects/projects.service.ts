import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileStorageService } from '../storage/file-storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    this.assertOwnership(project, userId);
    return project;
  }

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    return this.prisma.project.create({
      data: { userId, ...dto },
    });
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findOne(id, userId);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    if (project.blueprintPhotoPath) {
      await this.storage.delete(project.blueprintPhotoPath);
    }
    await this.prisma.project.delete({ where: { id } });
  }

  async duplicate(id: string, userId: string): Promise<Project> {
    const source = await this.findOne(id, userId);
    return this.prisma.project.create({
      data: {
        userId,
        name: `${source.name} (копия)`,
        address: source.address,
        objectType: source.objectType,
        defaultCeilingHeight: source.defaultCeilingHeight,
      },
    });
  }

  async uploadBlueprint(
    id: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Project> {
    const project = await this.findOne(id, userId);

    if (project.blueprintPhotoPath) {
      await this.storage.delete(project.blueprintPhotoPath);
    }

    const filePath = await this.storage.save(file, `projects/${id}/blueprint`);
    return this.prisma.project.update({
      where: { id },
      data: { blueprintPhotoPath: filePath },
    });
  }

  private assertOwnership(project: Project | null, userId: string): asserts project is Project {
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
