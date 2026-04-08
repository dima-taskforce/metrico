import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsCalcService } from './rooms-calc.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  providers: [RoomsService, RoomsCalcService],
  controllers: [RoomsController],
  exports: [RoomsCalcService],
})
export class RoomsModule {}
