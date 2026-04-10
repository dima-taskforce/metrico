import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PdfGeneratorService } from './pdf.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private pdfService: PdfGeneratorService) {}

  /**
   * GET /api/projects/:projectId/plan/pdf
   * Generates and returns a PDF report for the project floor plan.
   */
  @Get(':projectId/plan/pdf')
  async getPlanPdf(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.pdfService.generateProjectPdf(projectId, user.sub);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="plan-${projectId}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
