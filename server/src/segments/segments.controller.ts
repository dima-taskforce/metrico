import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { UpdateSegmentDto } from './dto/update-segment.dto';

@Controller('walls/:wallId/segments')
@UseGuards(JwtAuthGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  findAll(@Param('wallId') wallId: string, @CurrentUser() user: JwtPayload) {
    return this.segmentsService.findAll(wallId, user.sub);
  }

  @Get('validate')
  validate(@Param('wallId') wallId: string, @CurrentUser() user: JwtPayload) {
    return this.segmentsService.validate(wallId, user.sub);
  }

  @Post()
  create(
    @Param('wallId') wallId: string,
    @Body() dto: CreateSegmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.segmentsService.create(wallId, user.sub, dto);
  }

  @Patch(':segmentId')
  update(
    @Param('wallId') wallId: string,
    @Param('segmentId') segmentId: string,
    @Body() dto: UpdateSegmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.segmentsService.update(wallId, segmentId, user.sub, dto);
  }

  @Delete(':segmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('wallId') wallId: string,
    @Param('segmentId') segmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.segmentsService.remove(wallId, segmentId, user.sub);
  }
}
