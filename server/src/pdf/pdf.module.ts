import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanModule } from '../plan/plan.module';
import { PdfGeneratorService } from './pdf.service';
import { PdfController } from './pdf.controller';

@Module({
  imports: [PrismaModule, PlanModule],
  controllers: [PdfController],
  providers: [PdfGeneratorService],
})
export class PdfModule {}
