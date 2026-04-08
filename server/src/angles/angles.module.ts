import { Module } from '@nestjs/common';
import { AnglesController } from './angles.controller';
import { AnglesService } from './angles.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AnglesController],
  providers: [AnglesService],
  exports: [AnglesService],
})
export class AnglesModule {}
