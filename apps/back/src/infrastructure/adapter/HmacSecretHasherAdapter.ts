import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretHasher } from '../../application/port/SecretHasher';

/**
 * HMAC-SHA256 with HASH_SECRET. A 6-digit code has only a million values:
 * without the server key, a copy of the database is not enough to find them.
 */
@Injectable()
export class HmacSecretHasherAdapter extends SecretHasher {
  private readonly key: string;

  constructor(config: ConfigService) {
    super();
    this.key = config.getOrThrow<string>('HASH_SECRET');
  }

  hash(secret: string): string {
    return createHmac('sha256', this.key).update(secret).digest('hex');
  }

  matches(secret: string, hash: string): boolean {
    const expected = Buffer.from(hash, 'hex');
    const actual = Buffer.from(this.hash(secret), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
