import { createHmac, timingSafeEqual } from 'crypto';
import { CanActivate, ExecutionContext, Injectable, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { DomainException } from '../../domain/exception/DomainException';

const SIGNATURE_HEADER = 'x-hub-signature-256';

/**
 * Meta webhook: the request must carry X-Hub-Signature-256 = "sha256=" + HMAC-SHA256 of the raw body
 * with WHATSAPP_APP_SECRET. Without it, anyone could send fake "failed" statuses.
 */
@Injectable()
export class WhatsAppSignatureGuard implements CanActivate {
  private readonly appSecret: string;

  constructor(config: ConfigService) {
    this.appSecret = config.get<string>('WHATSAPP_APP_SECRET') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    if (!isValidMetaSignature(request.rawBody, request.header(SIGNATURE_HEADER), this.appSecret)) {
      throw new DomainException('unauthorized', 'Signature du webhook invalide.');
    }
    return true;
  }
}

/** Compares in constant time, so the signature cannot be guessed byte after byte. */
export function isValidMetaSignature(rawBody: Buffer | undefined, signature: string | undefined, appSecret: string): boolean {
  if (!rawBody || !signature || !appSecret) {
    return false;
  }
  const expected = Buffer.from(`sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
