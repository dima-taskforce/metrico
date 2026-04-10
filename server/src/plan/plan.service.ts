import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlanAssemblerService } from './plan-assembler.service';
import { ProjectsService } from '../projects/projects.service';
import { GetPlanDto } from './dto/get-plan.dto';

@Injectable()
export class PlanService {
  constructor(
    private prisma: PrismaService,
    private assembler: PlanAssemblerService,
    private projectsService: ProjectsService,
  ) {}

  /**
   * Get assembled floor plan for a project.
   * Returns comprehensive room/wall/element structure.
   */
  async getFloorPlan(projectId: string, userId: string): Promise<GetPlanDto> {
    await this.projectsService.findOne(projectId, userId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rooms: {
          include: {
            walls: {
              include: {
                segments: {
                  include: {
                    windowOpening: true,
                    doorOpening: true,
                  },
                  orderBy: { sortOrder: 'asc' as const },
                },
              },
            },
            elements: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Fetch angles and adjacencies for this project
    const angles = await this.prisma.angle.findMany({
      where: {
        room: { projectId },
      },
    });

    const adjacencies = await this.prisma.wallAdjacency.findMany({
      where: { projectId },
      include: {
        doorOpening: true,
      },
    });

    const plan = this.assembler.assembleFloorPlan(
      project.id,
      project.name,
      project.rooms,
      angles,
      adjacencies,
    );

    return plan;
  }

  /**
   * Save floor plan layout JSON to database.
   * Used after user modifies the visual layout (coordinates, rotations, etc).
   */
  async saveFloorPlanLayout(
    projectId: string,
    layoutJson: string,
    userId: string,
  ): Promise<{ id: string; projectId: string }> {
    await this.projectsService.findOne(projectId, userId);

    // Validate size (max 1 MB)
    if (layoutJson.length > 1_000_000) {
      throw new BadRequestException('layoutJson exceeds maximum allowed size');
    }

    // Validate JSON
    try {
      JSON.parse(layoutJson);
    } catch {
      throw new BadRequestException('Invalid JSON in layoutJson');
    }

    // Upsert floor plan layout (one per project)
    const layout = await this.prisma.floorPlanLayout.upsert({
      where: { projectId },
      update: { layoutJson },
      create: {
        projectId,
        layoutJson,
      },
    });

    return { id: layout.id, projectId: layout.projectId };
  }

  /**
   * Get saved floor plan layout from database.
   */
  async getFloorPlanLayout(projectId: string): Promise<string | null> {
    const layout = await this.prisma.floorPlanLayout.findUnique({
      where: { projectId },
    });

    if (!layout) {
      return null;
    }

    return layout.layoutJson;
  }

  /**
   * Mark project as COMPLETED. Called explicitly when user finishes review in SummaryStep.
   */
  async completeProject(projectId: string, userId: string): Promise<void> {
    await this.projectsService.findOne(projectId, userId);
    await this.projectsService.updateStatus(projectId, ProjectStatus.COMPLETED);
  }

  /**
   * Delete floor plan layout (returns to default auto-generated layout).
   */
  async deleteFloorPlanLayout(projectId: string, userId: string): Promise<void> {
    await this.projectsService.findOne(projectId, userId);
    const layout = await this.prisma.floorPlanLayout.findUnique({
      where: { projectId },
    });

    if (layout) {
      await this.prisma.floorPlanLayout.delete({
        where: { id: layout.id },
      });
    }
  }
}
