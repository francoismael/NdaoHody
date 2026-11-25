import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRIVATE_FILES_PATH, PrivateFile, PrivateFileStorage } from '../../application/port/PrivateFileStorage';

/** "documents/<uuid>.jpg": no "..", no absolute path. */
const SAFE_KEY = /^[a-z0-9_-]+\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Writes private files in PRIVATE_UPLOADS_DIR, which is never served as is.
 * A link is valid only with its expiry date and the HMAC signature of both (HASH_SECRET).
 */
@Injectable()
export class LocalPrivateFileStorageAdapter extends PrivateFileStorage {
  private readonly root: string;
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(config: ConfigService) {
    super();
    this.root = resolve(process.cwd(), config.getOrThrow<string>('PRIVATE_UPLOADS_DIR'));
    this.baseUrl = `${config.getOrThrow<string>('PUBLIC_BASE_URL')}/api/${PRIVATE_FILES_PATH}`;
    this.secret = config.getOrThrow<string>('HASH_SECRET');
  }

  async save(folder: string, content: Buffer, extension: string): Promise<string> {
    const key = `${folder}/${randomUUID()}.${extension}`;
    await mkdir(join(this.root, folder), { recursive: true });
    await writeFile(join(this.root, key), content);
    return key;
  }

  temporaryUrl(key: string, expiresInSeconds: number): string {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const query = new URLSearchParams({ key, expires: String(expires), signature: this.sign(key, expires) });
    return `${this.baseUrl}?${query.toString()}`;
  }

  async readTemporary(key: string, expires: number, signature: string): Promise<PrivateFile | null> {
    if (!SAFE_KEY.test(key) || !Number.isInteger(expires) || expires < Date.now() / 1000) {
      return null;
    }
    const expected = Buffer.from(this.sign(key, expires), 'hex');
    const given = Buffer.from(signature, 'hex');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      return null;
    }
    try {
      return { content: await readFile(join(this.root, key)), contentType: CONTENT_TYPES[extname(key)] ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  private sign(key: string, expires: number): string {
    return createHmac('sha256', this.secret).update(`private-file:${key}:${expires}`).digest('hex');
  }
}
