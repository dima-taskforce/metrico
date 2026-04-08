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
  async getFloorPlan(projectId: string): Promise<GetPlanDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rooms: {
          include: {
            walls: {
              include: {
                segments: true,
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

    // Mark project COMPLETED after successful assembly
    await this.projectsService.updateStatus(projectId, ProjectStatus.COMPLETED);

    return plan;
  }

  /**
   * Save floor plan layout JSON to database.
   * Used after user modifies the visual layout (coordinates, rotations, etc).
   */
  async saveFloorPlanLayout(
    projectId: string,
    layoutJson: string,
  ): Promise<{ id: string; projectId: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
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
   * Delete floor plan layout (returns to default auto-generated layout).
   */
  async deleteFloorPlanLayout(projectId: string): Promise<void> {
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
