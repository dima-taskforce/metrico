import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { AdjacencyService } from './adjacency.service';
import { CreateAdjacencyDto } from './dto/create-adjacency.dto';

@Controller('projects/:projectId/adjacencies')
@UseGuards(JwtAuthGuard)
export class AdjacencyController {
  constructor(private readonly adjacencyService: AdjacencyService) {}

  @Post()
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateAdjacencyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adjacencyService.create(projectId, dto, user.sub);
  }

  @Get()
  async findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adjacencyService.findByProject(projectId, user.sub);
  }

  @Delete(':adjacencyId')
  @HttpCode(204)
  async delete(
    @Param('adjacencyId') adjacencyId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.adjacencyService.delete(adjacencyId, projectId, user.sub);
  }
}
