import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { PhotosService } from './photos.service';
import { IsEnum } from 'class-validator';
import { PhotoType } from '@prisma/client';

class UploadPhotoDto {
  @IsEnum(PhotoType)
  photoType!: PhotoType;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

@Controller('rooms/:roomId/photos')
@UseGuards(JwtAuthGuard)
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get()
  findAll(@Param('roomId') roomId: string, @CurrentUser() user: JwtPayload) {
    return this.photosService.findAll(roomId, user.sub);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('roomId') roomId: string,
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })] }))
    file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.photosService.upload(roomId, user.sub, file, dto.photoType);
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('roomId') roomId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.photosService.remove(roomId, photoId, user.sub);
  }
}
