import { Module } from '@nestjs/common';
import { AdjacencyService } from './adjacency.service';
import { AdjacencyController } from './adjacency.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, ProjectsModule],
  providers: [AdjacencyService],
  controllers: [AdjacencyController],
  exports: [AdjacencyService],
})
export class AdjacencyModule {}
