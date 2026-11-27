import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppSender } from '../../application/port/WhatsAppSender';

/**
 * WHATSAPP_PROVIDER=log: writes the code in the server logs instead of sending it (local development).
 * Refused in production by validateEnvironment, since the logs would contain the codes.
 */
@Injectable()
export class LogWhatsAppSenderAdapter extends WhatsAppSender {
  private readonly logger = new Logger('WhatsApp');

  async sendCode(telephone: string, code: string): Promise<string> {
    const messageId = `log-${randomUUID()}`;
    this.logger.log(`To ${telephone}: Ndaohody code ${code} (message ${messageId})`);
    return messageId;
  }
}
