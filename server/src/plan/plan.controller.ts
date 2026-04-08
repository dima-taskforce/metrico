import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanService } from './plan.service';
import { GetPlanDto } from './dto/get-plan.dto';

@Controller('api/projects')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private planService: PlanService) {}

  /**
   * GET /api/projects/:projectId/plan
   * Returns assembled floor plan (rooms, walls, elements, adjacencies, stats).
   */
  @Get(':projectId/plan')
  async getFloorPlan(@Param('projectId') projectId: string): Promise<GetPlanDto> {
    return this.planService.getFloorPlan(projectId);
  }

  /**
   * PUT /api/projects/:projectId/plan
   * Save floor plan layout JSON (coordinates, rotations after user modifies canvas).
   */
  @Put(':projectId/plan')
  @HttpCode(200)
  async saveFloorPlanLayout(
    @Param('projectId') projectId: string,
    @Body('layoutJson') layoutJson: string,
  ): Promise<{ id: string; projectId: string }> {
    return this.planService.saveFloorPlanLayout(projectId, layoutJson);
  }

  /**
   * DELETE /api/projects/:projectId/plan
   * Delete custom floor plan layout (revert to auto-generated).
   */
  @Delete(':projectId/plan')
  @HttpCode(204)
  async deleteFloorPlanLayout(@Param('projectId') projectId: string): Promise<void> {
    return this.planService.deleteFloorPlanLayout(projectId);
  }
}
