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
import { ElementsService } from './elements.service';
import { CreateElementDto } from './dto/create-element.dto';
import { UpdateElementDto } from './dto/update-element.dto';

@Controller('rooms/:roomId/elements')
@UseGuards(JwtAuthGuard)
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  @Get()
  findAll(@Param('roomId') roomId: string, @CurrentUser() user: JwtPayload) {
    return this.elementsService.findAll(roomId, user.sub);
  }

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body() dto: CreateElementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.elementsService.create(roomId, user.sub, dto);
  }

  @Patch(':elementId')
  update(
    @Param('roomId') roomId: string,
    @Param('elementId') elementId: string,
    @Body() dto: UpdateElementDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.elementsService.update(roomId, elementId, user.sub, dto);
  }

  @Delete(':elementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId') roomId: string,
    @Param('elementId') elementId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.elementsService.remove(roomId, elementId, user.sub);
  }
}
