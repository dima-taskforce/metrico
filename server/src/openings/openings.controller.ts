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
import { OpeningsService } from './openings.service';
import { CreateWindowDto } from './dto/create-window.dto';
import { UpdateWindowDto } from './dto/update-window.dto';
import { CreateDoorDto } from './dto/create-door.dto';
import { UpdateDoorDto } from './dto/update-door.dto';

@Controller('walls/:wallId')
@UseGuards(JwtAuthGuard)
export class OpeningsController {
  constructor(private readonly openingsService: OpeningsService) {}

  // ─── Windows ─────────────────────────────────────────────────────────────

  @Get('windows')
  findAllWindows(@Param('wallId') wallId: string, @CurrentUser() user: JwtPayload) {
    return this.openingsService.findAllWindows(wallId, user.sub);
  }

  @Post('windows')
  createWindow(
    @Param('wallId') wallId: string,
    @Body() dto: CreateWindowDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.createWindow(wallId, user.sub, dto);
  }

  @Patch('windows/:windowId')
  updateWindow(
    @Param('wallId') wallId: string,
    @Param('windowId') windowId: string,
    @Body() dto: UpdateWindowDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.updateWindow(wallId, windowId, user.sub, dto);
  }

  @Delete('windows/:windowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWindow(
    @Param('wallId') wallId: string,
    @Param('windowId') windowId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.removeWindow(wallId, windowId, user.sub);
  }

  // ─── Doors ───────────────────────────────────────────────────────────────

  @Get('doors')
  findAllDoors(@Param('wallId') wallId: string, @CurrentUser() user: JwtPayload) {
    return this.openingsService.findAllDoors(wallId, user.sub);
  }

  @Post('doors')
  createDoor(
    @Param('wallId') wallId: string,
    @Body() dto: CreateDoorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.createDoor(wallId, user.sub, dto);
  }

  @Patch('doors/:doorId')
  updateDoor(
    @Param('wallId') wallId: string,
    @Param('doorId') doorId: string,
    @Body() dto: UpdateDoorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.updateDoor(wallId, doorId, user.sub, dto);
  }

  @Delete('doors/:doorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDoor(
    @Param('wallId') wallId: string,
    @Param('doorId') doorId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.openingsService.removeDoor(wallId, doorId, user.sub);
  }
}
