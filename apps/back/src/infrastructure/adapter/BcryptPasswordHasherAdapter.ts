import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PasswordHasher } from '../../application/port/PasswordHasher';

/** Cost 12: about 0.25 s per hash, slow enough against brute force. */
export const BCRYPT_COST = 12;

@Injectable()
export class BcryptPasswordHasherAdapter extends PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, BCRYPT_COST);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
