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
  ) {
    return this.adjacencyService.create(projectId, dto);
  }

  @Get()
  async findByProject(@Param('projectId') projectId: string) {
    return this.adjacencyService.findByProject(projectId);
  }

  @Delete(':adjacencyId')
  @HttpCode(204)
  async delete(@Param('adjacencyId') adjacencyId: string) {
    await this.adjacencyService.delete(adjacencyId);
  }
}
