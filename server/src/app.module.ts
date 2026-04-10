import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { RoomsModule } from './rooms/rooms.module';
import { WallsModule } from './walls/walls.module';
import { OpeningsModule } from './openings/openings.module';
import { ElementsModule } from './elements/elements.module';
import { AnglesModule } from './angles/angles.module';
import { SegmentsModule } from './segments/segments.module';
import { PhotosModule } from './photos/photos.module';
import { AdjacencyModule } from './adjacency/adjacency.module';
import { SketchModule } from './sketch/sketch.module';
import { PlanModule } from './plan/plan.module';
import { PdfModule } from './pdf/pdf.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 30 }] }),
    PrismaModule,
    StorageModule,
    AuthModule,
    ProjectsModule,
    RoomsModule,
    WallsModule,
    OpeningsModule,
    ElementsModule,
    AnglesModule,
    SegmentsModule,
    PhotosModule,
    AdjacencyModule,
    SketchModule,
    PlanModule,
    PdfModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
