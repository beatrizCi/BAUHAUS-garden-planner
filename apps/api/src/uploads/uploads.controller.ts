import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** multipart/form-data with field "file" */
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Field "file" missing');
    return this.uploads.storeImage(file.buffer);
  }

  /** JSON { dataUrl } – used for canvas snapshots (thumbnails, renders). */
  @Post('data-url')
  uploadDataUrl(@Body('dataUrl') dataUrl: string, @Body('format') format?: 'jpeg' | 'png') {
    return this.uploads.storeImage(this.uploads.decodeDataUrl(dataUrl), { format, maxSize: 1600 });
  }
}
