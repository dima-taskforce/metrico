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
import { AnglesService } from './angles.service';
import { CreateAngleDto } from './dto/create-angle.dto';
import { UpdateAngleDto } from './dto/update-angle.dto';

@Controller('rooms/:roomId/angles')
@UseGuards(JwtAuthGuard)
export class AnglesController {
  constructor(private readonly anglesService: AnglesService) {}

  @Get()
  findAll(@Param('roomId') roomId: string, @CurrentUser() user: JwtPayload) {
    return this.anglesService.findAll(roomId, user.sub);
  }

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body() dto: CreateAngleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.anglesService.create(roomId, user.sub, dto);
  }

  @Patch(':angleId')
  update(
    @Param('roomId') roomId: string,
    @Param('angleId') angleId: string,
    @Body() dto: UpdateAngleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.anglesService.update(roomId, angleId, user.sub, dto);
  }

  @Delete(':angleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId') roomId: string,
    @Param('angleId') angleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.anglesService.remove(roomId, angleId, user.sub);
  }
}
