import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { isAxiosError } from 'axios';
import { describeError } from '../../application/helper/bestEffort';
import { isRecord, text } from '../../application/helper/json';
import { WhatsAppSender } from '../../application/port/WhatsAppSender';

const GRAPH_URL = 'https://graph.facebook.com/v23.0';
const TIMEOUT_MS = 8000;

/**
 * WHATSAPP_PROVIDER=meta: WhatsApp Cloud API (POST /{phone-number-id}/messages, type "template").
 * The authentication template takes the code twice: in its text and in its "Copy code" button.
 * Any refusal of Meta throws, so the code is sent by SMS at once.
 */
@Injectable()
export class MetaWhatsAppSenderAdapter extends WhatsAppSender {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly templateName: string;
  private readonly templateLanguage: string;

  constructor(config: ConfigService) {
    super();
    this.accessToken = config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.templateName = config.getOrThrow<string>('WHATSAPP_TEMPLATE_NAME');
    this.templateLanguage = config.getOrThrow<string>('WHATSAPP_TEMPLATE_LANGUAGE');
  }

  async sendCode(telephone: string, code: string): Promise<string> {
    let body: unknown;
    try {
      const response = await axios.post<unknown>(
        `${GRAPH_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: telephone.replace(/^\+/, ''),
          type: 'template',
          template: {
            name: this.templateName,
            language: { code: this.templateLanguage },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: code }] },
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
            ],
          },
        },
        { headers: { Authorization: `Bearer ${this.accessToken}` }, timeout: TIMEOUT_MS },
      );
      body = response.data;
    } catch (error) {
      throw new Error(describeMetaError(error));
    }

    const messages = isRecord(body) ? body['messages'] : undefined;
    const first: unknown = Array.isArray(messages) ? messages[0] : undefined;
    const messageId = isRecord(first) ? text(first['id']) : null;
    if (!messageId) {
      throw new Error('Meta answered without a message id.');
    }
    return messageId;
  }
}

/** "Meta refused the message (HTTP 400): <Meta's message>", or the network error. */
function describeMetaError(error: unknown): string {
  if (!isAxiosError(error)) {
    return describeError(error);
  }
  const data: unknown = error.response?.data;
  const metaError = isRecord(data) ? data['error'] : undefined;
  const detail = (isRecord(metaError) ? text(metaError['message']) : null) ?? error.message;
  return error.response ? `Meta refused the message (HTTP ${error.response.status}): ${detail}` : `No answer from Meta: ${detail}`;
}
