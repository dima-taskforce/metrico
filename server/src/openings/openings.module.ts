import { Module } from '@nestjs/common';
import { OpeningsController } from './openings.controller';
import { OpeningsService } from './openings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OpeningsController],
  providers: [OpeningsService],
  exports: [OpeningsService],
})
export class OpeningsModule {}
