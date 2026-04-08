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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ReorderRoomsDto } from './dto/reorder-rooms.dto';

@Controller('projects/:projectId/rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findAll(projectId, user.sub);
  }

  @Get(':roomId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.findOne(projectId, roomId, user.sub);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.create(projectId, user.sub, dto);
  }

  @Patch(':roomId')
  update(
    @Param('projectId') projectId: string,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.update(projectId, roomId, user.sub, dto);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('projectId') projectId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.remove(projectId, roomId, user.sub);
  }

  @Post('reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Body() dto: ReorderRoomsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.reorder(projectId, user.sub, dto);
  }
}
