import { randomBytes, randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';
import { RandomGenerator } from '../../application/port/RandomGenerator';

const OTP_DIGITS = 6;
const TOKEN_BYTES = 32;
const PASSWORD_BYTES = 12;

@Injectable()
export class CryptoRandomGeneratorAdapter extends RandomGenerator {
  otpCode(): string {
    return randomInt(0, 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, '0');
  }

  token(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
  }

  /** 16 characters (letters, digits, - and _). */
  password(): string {
    return randomBytes(PASSWORD_BYTES).toString('base64url');
  }
}
