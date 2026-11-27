import { ConfigService } from '@nestjs/config';
import { WhatsAppWebhookController } from '../../../src/api/controller/WhatsAppWebhookController';
import { setupOtp } from '../../support/otpSetup';

const VERIFY_TOKEN = 'webhook-verify-token';

function setup() {
  const otp = setupOtp();
  const controller = new WhatsAppWebhookController(
    new ConfigService({ WHATSAPP_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN }),
    otp.statuses,
  );
  return { ...otp, controller };
}

describe('WhatsAppWebhookController', () => {
  it('GET: answers the challenge when Meta sends the right verify token', () => {
    const { controller } = setup();

    expect(controller.verify('subscribe', VERIFY_TOKEN, '1158201444')).toBe('1158201444');
  });

  it('GET: refuses a wrong token or mode with 403', () => {
    const { controller } = setup();

    expect(() => controller.verify('subscribe', 'wrong', '1158201444')).toThrow(expect.objectContaining({ reason: 'forbidden' }));
    expect(() => controller.verify('unsubscribe', VERIFY_TOKEN, '1158201444')).toThrow(
      expect.objectContaining({ reason: 'forbidden' }),
    );
  });

  it('POST: reads the "failed" status of a Meta payload and sends the code again by SMS', async () => {
    const { controller, request, sms } = setup();
    await request.execute('0341234567');

    controller.receive({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [{ id: 'wamid-1', status: 'failed', recipient_id: '261341234567', errors: [{ code: 131026 }] }],
              },
            },
          ],
        },
      ],
    });
    await new Promise((resolve) => setImmediate(resolve)); // handled after the answer

    expect(sms.sent).toHaveLength(1);
  });

  it('POST: a malformed payload is ignored', () => {
    const { controller, sms } = setup();

    expect(() => controller.receive({ entry: 'nothing' })).not.toThrow();
    expect(() => controller.receive(null)).not.toThrow();
    expect(sms.sent).toHaveLength(0);
  });
});
