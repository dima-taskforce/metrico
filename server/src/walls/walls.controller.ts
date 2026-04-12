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
import { WallsService } from './walls.service';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';

@Controller('rooms/:roomId/walls')
@UseGuards(JwtAuthGuard)
export class WallsController {
  constructor(private readonly wallsService: WallsService) {}

  @Get()
  findAll(@Param('roomId') roomId: string, @CurrentUser() user: JwtPayload) {
    return this.wallsService.findAll(roomId, user.sub);
  }

  @Get(':wallId')
  findOne(
    @Param('roomId') roomId: string,
    @Param('wallId') wallId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wallsService.findOne(roomId, wallId, user.sub);
  }

  @Post()
  create(
    @Param('roomId') roomId: string,
    @Body() dto: CreateWallDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wallsService.create(roomId, user.sub, dto);
  }

  @Patch(':wallId')
  update(
    @Param('roomId') roomId: string,
    @Param('wallId') wallId: string,
    @Body() dto: UpdateWallDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wallsService.update(wallId, user.sub, dto);
  }

  @Delete(':wallId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId') roomId: string,
    @Param('wallId') wallId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.wallsService.remove(wallId, user.sub);
  }
}
