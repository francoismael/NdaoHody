import { createHmac } from 'crypto';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isValidMetaSignature, WhatsAppSignatureGuard } from '../../../src/api/guard/WhatsAppSignatureGuard';

const APP_SECRET = 'meta-app-secret';
const BODY = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');

function sign(body: Buffer, secret = APP_SECRET): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

/** An HTTP context holding a request with this raw body and signature header. */
function httpContext(rawBody: Buffer | undefined, signature: string | undefined): ExecutionContext {
  const request = { rawBody, header: (name: string) => (name === 'x-hub-signature-256' ? signature : undefined) };
  const context: Pick<ExecutionContext, 'switchToHttp'> = {
    switchToHttp: () => ({ getRequest: <T>() => request as T, getResponse: <T>() => ({}) as T, getNext: <T>() => ({}) as T }),
  };
  return context as ExecutionContext;
}

describe('WhatsAppSignatureGuard', () => {
  const guard = new WhatsAppSignatureGuard(new ConfigService({ WHATSAPP_APP_SECRET: APP_SECRET }));

  it('accepts a request signed by Meta with the app secret', () => {
    expect(guard.canActivate(httpContext(BODY, sign(BODY)))).toBe(true);
  });

  it('refuses a wrong, missing or tampered signature with 401', () => {
    expect(() => guard.canActivate(httpContext(BODY, sign(BODY, 'another-secret')))).toThrow(
      expect.objectContaining({ reason: 'unauthorized' }),
    );
    expect(() => guard.canActivate(httpContext(BODY, undefined))).toThrow(expect.objectContaining({ reason: 'unauthorized' }));
    expect(() => guard.canActivate(httpContext(Buffer.from('{"entry":[1]}'), sign(BODY)))).toThrow(
      expect.objectContaining({ reason: 'unauthorized' }),
    );
  });

  it('refuses everything while WHATSAPP_APP_SECRET is not set', () => {
    expect(isValidMetaSignature(BODY, sign(BODY, ''), '')).toBe(false);
  });
});
