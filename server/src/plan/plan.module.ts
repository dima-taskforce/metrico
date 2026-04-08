import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { PlanAssemblerService } from './plan-assembler.service';

@Module({
  imports: [PrismaModule, RoomsModule],
  controllers: [PlanController],
  providers: [PlanService, PlanAssemblerService],
  exports: [PlanService],
})
export class PlanModule {}
