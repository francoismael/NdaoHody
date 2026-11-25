import { Controller, Get, Header, NotFoundException, ParseIntPipe, Query, StreamableFile } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PRIVATE_FILES_PATH, PrivateFileStorage } from '../../application/port/PrivateFileStorage';

/**
 * GET /api/files?key=...&expires=...&signature=...
 * Serves a private file (licence, selfie) behind a temporary signed link given by the API.
 */
@ApiExcludeController()
@Controller(PRIVATE_FILES_PATH)
export class FilesController {
  constructor(private readonly privateFiles: PrivateFileStorage) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  async read(
    @Query('key') key: string,
    @Query('expires', ParseIntPipe) expires: number,
    @Query('signature') signature: string,
  ): Promise<StreamableFile> {
    const file = await this.privateFiles.readTemporary(key ?? '', expires, signature ?? '');
    if (!file) {
      throw new NotFoundException('Lien expiré ou invalide.');
    }
    return new StreamableFile(file.content, { type: file.contentType });
  }
}
