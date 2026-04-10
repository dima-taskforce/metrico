import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { SketchService } from './sketch.service';

@Controller('projects/:projectId/sketch')
@UseGuards(JwtAuthGuard)
export class SketchController {
  constructor(private readonly sketchService: SketchService) {}

  @Get()
  async get(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sketchService.getSketch(projectId, user.sub);
  }

  @Put()
  async save(
    @Param('projectId') projectId: string,
    @Body('sketchJson') sketchJson: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sketchService.saveSketch(projectId, user.sub, sketchJson);
  }

  @Delete()
  @HttpCode(204)
  async delete(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.sketchService.deleteSketch(projectId, user.sub);
  }
}
