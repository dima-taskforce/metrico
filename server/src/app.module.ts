import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 30 }] }),
    PrismaModule,
    StorageModule,
    AuthModule,
    ProjectsModule,
    RoomsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
