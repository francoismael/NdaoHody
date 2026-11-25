import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from '../../application/port/SmsSender';

/**
 * SMS_PROVIDER=log: writes the SMS in the server logs instead of sending it (local development).
 * Refused in production by validateEnvironment, since the logs would contain the codes.
 */
@Injectable()
export class LogSmsSenderAdapter extends SmsSender {
  private readonly logger = new Logger('SMS');

  async send(telephone: string, message: string): Promise<void> {
    this.logger.log(`To ${telephone}: ${message}`);
  }
}
