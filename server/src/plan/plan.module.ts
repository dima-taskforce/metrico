import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ProjectsModule } from '../projects/projects.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { PlanAssemblerService } from './plan-assembler.service';
import { GeometryAssemblerService } from './geometry-assembler.service';

@Module({
  imports: [PrismaModule, RoomsModule, ProjectsModule],
  controllers: [PlanController],
  providers: [PlanService, PlanAssemblerService, GeometryAssemblerService],
  exports: [PlanService],
})
export class PlanModule {}
