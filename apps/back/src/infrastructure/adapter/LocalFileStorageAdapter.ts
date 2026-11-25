import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorage } from '../../application/port/FileStorage';

/** URL path under which the files of UPLOADS_DIR are served (see setupHttpServer). */
export const UPLOADS_URL_PATH = '/uploads';

/**
 * Writes files in UPLOADS_DIR; the API serves them under /uploads.
 * Replace with a cloud storage adapter in production without touching the use cases.
 */
@Injectable()
export class LocalFileStorageAdapter extends FileStorage {
  private readonly root: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    super();
    this.root = resolve(process.cwd(), config.getOrThrow<string>('UPLOADS_DIR'));
    this.publicUrl = `${config.getOrThrow<string>('PUBLIC_BASE_URL')}${UPLOADS_URL_PATH}`;
  }

  async save(folder: string, content: Buffer, extension: string): Promise<string> {
    const fileName = `${randomUUID()}.${extension}`;
    const directory = join(this.root, folder);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, fileName), content);
    return `${this.publicUrl}/${folder}/${fileName}`;
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(`${this.publicUrl}/`)) {
      return;
    }
    const [folder, fileName] = url.slice(this.publicUrl.length + 1).split('/');
    if (!folder || !fileName) {
      return;
    }
    // basename() keeps the path inside UPLOADS_DIR, whatever the URL contains.
    await rm(join(this.root, basename(folder), basename(fileName)), { force: true });
  }
}
