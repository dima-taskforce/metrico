import { Module } from '@nestjs/common';
import { WallsController } from './walls.controller';
import { WallsService } from './walls.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WallsController],
  providers: [WallsService],
  exports: [WallsService],
})
export class WallsModule {}
