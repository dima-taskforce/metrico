import { Module } from '@nestjs/common';
import { SketchService } from './sketch.service';
import { SketchController } from './sketch.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [SketchController],
  providers: [SketchService],
  exports: [SketchService],
})
export class SketchModule {}
