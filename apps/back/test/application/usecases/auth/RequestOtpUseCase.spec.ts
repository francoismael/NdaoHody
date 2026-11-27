import { DomainException } from '../../../../src/domain/exception/DomainException';
import { InMemorySettings, InMemoryUsers, makeUser, NOW } from '../../../support/inMemory';
import { setupOtp } from '../../../support/otpSetup';

const PHONE = '+261341234567';
const DAY_SECONDS = 24 * 60 * 60;

describe('RequestOtpUseCase', () => {
  it('sends the code on WhatsApp by default, to the normalized number, and stores only its hash', async () => {
    const { request, otpCodes, sms, whatsapp } = setupOtp();

    await expect(request.execute('034 12 345 67')).resolves.toEqual({
      expiresInSeconds: 300,
      resendInSeconds: 60,
      canal: 'whatsapp',
    });

    expect(whatsapp.sent).toEqual([{ telephone: PHONE, code: '048213', messageId: 'wamid-1' }]);
    expect(sms.sent).toHaveLength(0);
    expect(otpCodes.rows[0]).toMatchObject({ canal: 'whatsapp', whatsappMessageId: 'wamid-1', codeHash: 'hash:048213' });
    expect(otpCodes.rows[0]?.dateExpiration).toEqual(new Date(NOW.getTime() + 5 * 60_000));
  });

  it('sends it by SMS when the app asks for SMS', async () => {
    const { request, otpCodes, sms, whatsapp } = setupOtp();

    await expect(request.execute('0341234567', 'sms')).resolves.toMatchObject({ canal: 'sms' });

    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.telephone).toBe(PHONE);
    expect(sms.sent[0]?.message).toContain('048213');
    expect(whatsapp.sent).toHaveLength(0);
    expect(otpCodes.rows[0]).toMatchObject({ canal: 'sms', whatsappMessageId: null });
  });

  it('goes straight to SMS when the last WhatsApp message to this number failed less than 30 days ago', async () => {
    const { request, statuses, sms, whatsapp, clock } = setupOtp();
    await request.execute('0341234567');
    await statuses.execute([{ messageId: 'wamid-1', status: 'failed' }]); // fallback SMS #1
    clock.advanceSeconds(20 * DAY_SECONDS);

    await expect(request.execute('0341234567')).resolves.toMatchObject({ canal: 'sms' });
    expect(whatsapp.sent).toHaveLength(1);
    expect(sms.sent).toHaveLength(2);

    // 31 days after the failure: WhatsApp again.
    clock.advanceSeconds(11 * DAY_SECONDS);
    await expect(request.execute('0341234567')).resolves.toMatchObject({ canal: 'whatsapp' });
  });

  it('sends an SMS at once when Meta refuses the WhatsApp message, and cancels the WhatsApp code', async () => {
    const { request, otpCodes, sms, whatsapp } = setupOtp();
    whatsapp.failing = true;

    await expect(request.execute('0341234567')).resolves.toMatchObject({ canal: 'sms' });

    expect(sms.sent).toHaveLength(1);
    expect(otpCodes.rows[0]).toMatchObject({ canal: 'whatsapp', dateAnnulation: NOW });
    expect(otpCodes.rows[1]).toMatchObject({ canal: 'sms', dateAnnulation: null });
  });

  it('uses the validity set in the parametre table', async () => {
    const { request } = setupOtp(new InMemoryUsers(), new InMemorySettings({ otp_duree_minutes: 10 }));

    await expect(request.execute('0341234567')).resolves.toMatchObject({ expiresInSeconds: 600 });
  });

  it('rejects a number that is not a Malagasy mobile number', async () => {
    const { request, sms, whatsapp } = setupOtp();

    await expect(request.execute('0201234567')).rejects.toMatchObject({ reason: 'invalid' });
    expect(sms.sent).toHaveLength(0);
    expect(whatsapp.sent).toHaveLength(0);
  });

  it('refuses a new code less than 60 s after the previous one, whatever the channel', async () => {
    const { request, clock } = setupOtp();
    await request.execute('0341234567');
    clock.advanceSeconds(20);

    await expect(request.execute('0341234567', 'sms')).rejects.toMatchObject({
      reason: 'too_many_requests',
      details: { retryInSeconds: 40 },
    });
  });

  it('refuses a 6th code within 24 h', async () => {
    const { request, clock } = setupOtp();
    for (let sent = 0; sent < 5; sent += 1) {
      await request.execute('0341234567');
      clock.advanceSeconds(61);
    }

    await expect(request.execute('0341234567', 'sms')).rejects.toMatchObject({ reason: 'too_many_requests' });
  });

  it('sends no code to a suspended account', async () => {
    const { request, sms, whatsapp } = setupOtp(new InMemoryUsers(makeUser({ statut: 'suspendu' })));

    await expect(request.execute('0341234567')).rejects.toBeInstanceOf(DomainException);
    await expect(request.execute('0341234567')).rejects.toMatchObject({ reason: 'forbidden' });
    expect(sms.sent).toHaveLength(0);
    expect(whatsapp.sent).toHaveLength(0);
  });
});
