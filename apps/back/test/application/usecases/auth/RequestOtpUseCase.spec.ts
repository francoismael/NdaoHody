import { DomainException } from '../../../../src/domain/exception/DomainException';
import {
  FixedClock,
  InMemoryOtpCodes,
  InMemorySettings,
  InMemoryUsers,
  makeUser,
  NOW,
  PlainHasher,
  PredictableRandom,
  RecordingSms,
} from '../../../support/inMemory';
import { RequestOtpUseCase } from '../../../../src/application/usecases/auth/RequestOtpUseCase';

function setup(users = new InMemoryUsers(), settings = new InMemorySettings()) {
  const otpCodes = new InMemoryOtpCodes();
  const sms = new RecordingSms();
  const clock = new FixedClock();
  const useCase = new RequestOtpUseCase(
    otpCodes,
    users,
    settings,
    sms,
    new PlainHasher(),
    new PredictableRandom('048213'),
    clock,
  );
  return { useCase, otpCodes, sms, clock };
}

describe('RequestOtpUseCase', () => {
  it('sends a code to the normalized number and stores only its hash', async () => {
    const { useCase, otpCodes, sms } = setup();

    await expect(useCase.execute('034 12 345 67')).resolves.toEqual({ expiresInSeconds: 300, resendInSeconds: 60 });

    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.telephone).toBe('+261341234567');
    expect(sms.sent[0]?.message).toContain('048213');
    expect(otpCodes.rows[0]?.codeHash).toBe('hash:048213');
    expect(otpCodes.rows[0]?.dateExpiration).toEqual(new Date(NOW.getTime() + 5 * 60_000));
  });

  it('uses the validity set in the parametre table', async () => {
    const { useCase } = setup(new InMemoryUsers(), new InMemorySettings({ otp_duree_minutes: 10 }));

    await expect(useCase.execute('0341234567')).resolves.toMatchObject({ expiresInSeconds: 600 });
  });

  it('rejects a number that is not a Malagasy mobile number', async () => {
    const { useCase, sms } = setup();

    await expect(useCase.execute('0201234567')).rejects.toMatchObject({ reason: 'invalid' });
    expect(sms.sent).toHaveLength(0);
  });

  it('refuses a new code less than 60 s after the previous one', async () => {
    const { useCase, clock } = setup();
    await useCase.execute('0341234567');
    clock.advanceSeconds(20);

    await expect(useCase.execute('0341234567')).rejects.toMatchObject({
      reason: 'too_many_requests',
      details: { retryInSeconds: 40 },
    });
  });

  it('refuses a 6th code within 24 h', async () => {
    const { useCase, clock } = setup();
    for (let sent = 0; sent < 5; sent += 1) {
      await useCase.execute('0341234567');
      clock.advanceSeconds(61);
    }

    await expect(useCase.execute('0341234567')).rejects.toMatchObject({ reason: 'too_many_requests' });
  });

  it('sends no SMS to a suspended account', async () => {
    const { useCase, sms } = setup(new InMemoryUsers(makeUser({ statut: 'suspendu' })));

    await expect(useCase.execute('0341234567')).rejects.toBeInstanceOf(DomainException);
    await expect(useCase.execute('0341234567')).rejects.toMatchObject({ reason: 'forbidden' });
    expect(sms.sent).toHaveLength(0);
  });
});
