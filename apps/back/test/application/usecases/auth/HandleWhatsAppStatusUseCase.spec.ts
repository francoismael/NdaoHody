import { setupOtp } from '../../../support/otpSetup';

const FAILED = { messageId: 'wamid-1', status: 'failed' };

async function codeSentOnWhatsApp() {
  const otp = setupOtp();
  await otp.request.execute('0341234567');
  return otp;
}

describe('HandleWhatsAppStatusUseCase', () => {
  it('"failed": cancels the WhatsApp code and sends a new code by SMS, without waiting 60 s', async () => {
    const { statuses, otpCodes, sms, clock } = await codeSentOnWhatsApp();
    clock.advanceSeconds(5);

    await statuses.execute([FAILED]);

    expect(otpCodes.rows[0]).toMatchObject({ canal: 'whatsapp', dateAnnulation: clock.now(), dateEchecLivraison: clock.now() });
    expect(otpCodes.rows[1]).toMatchObject({ canal: 'sms', dateAnnulation: null });
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.message).toContain('048213');
  });

  it('the same "failed" status received twice sends one SMS only', async () => {
    const { statuses, sms } = await codeSentOnWhatsApp();

    await statuses.execute([FAILED, FAILED]);
    await statuses.execute([FAILED]);

    expect(sms.sent).toHaveLength(1);
  });

  it('ignores the other statuses and unknown messages', async () => {
    const { statuses, otpCodes, sms } = await codeSentOnWhatsApp();

    await statuses.execute([
      { messageId: 'wamid-1', status: 'sent' },
      { messageId: 'wamid-1', status: 'delivered' },
      { messageId: 'wamid-unknown', status: 'failed' },
    ]);

    expect(sms.sent).toHaveLength(0);
    expect(otpCodes.rows[0]).toMatchObject({ dateAnnulation: null, dateEchecLivraison: null });
  });

  it('no fallback when the code was already used', async () => {
    const { statuses, otpCodes, sms, clock } = await codeSentOnWhatsApp();
    await otpCodes.markUsed(1, clock.now());

    await statuses.execute([FAILED]);

    expect(sms.sent).toHaveLength(0);
  });

  it('no fallback when the code has expired', async () => {
    const { statuses, sms, clock } = await codeSentOnWhatsApp();
    clock.advanceSeconds(5 * 60);

    await statuses.execute([FAILED]);

    expect(sms.sent).toHaveLength(0);
  });

  it('no fallback when 5 codes were already sent today', async () => {
    const { request, statuses, otpCodes, sms, clock } = setupOtp();
    for (let sent = 0; sent < 5; sent += 1) {
      await request.execute('0341234567');
      clock.advanceSeconds(61);
    }
    clock.advanceSeconds(-61);

    await statuses.execute([{ messageId: 'wamid-5', status: 'failed' }]);

    expect(sms.sent).toHaveLength(0);
    expect(otpCodes.rows[4]).toMatchObject({ dateAnnulation: null }); // still the code to type
  });
});
