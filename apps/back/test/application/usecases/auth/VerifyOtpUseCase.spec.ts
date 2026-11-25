import { SessionIssuerService } from '../../../../src/application/service/SessionIssuerService';
import {
  DirectUnitOfWork,
  FakeAccessTokens,
  FixedClock,
  InMemoryOtpCodes,
  InMemorySessions,
  InMemoryUsers,
  makeUser,
  NOW,
  PlainHasher,
  PredictableRandom,
} from '../../../support/inMemory';
import { VerifyOtpUseCase } from '../../../../src/application/usecases/auth/VerifyOtpUseCase';

const PHONE = '+261341234567';

async function setup(users = new InMemoryUsers()) {
  const otpCodes = new InMemoryOtpCodes();
  const sessions = new InMemorySessions();
  const clock = new FixedClock();
  const hasher = new PlainHasher();
  const issuer = new SessionIssuerService(sessions, hasher, new PredictableRandom(), new FakeAccessTokens(), clock);
  const useCase = new VerifyOtpUseCase(otpCodes, users, hasher, issuer, new DirectUnitOfWork(), clock);
  await otpCodes.create({
    telephone: PHONE,
    codeHash: hasher.hash('123456'),
    dateExpiration: new Date(NOW.getTime() + 5 * 60_000),
    dateCreation: NOW,
  });
  return { useCase, otpCodes, sessions, users, clock };
}

describe('VerifyOtpUseCase', () => {
  it('creates the account on the first sign-in and opens a session', async () => {
    const { useCase, users, sessions, otpCodes } = await setup();

    const result = await useCase.execute('034 12 345 67', '123456');

    expect(result.nouveau).toBe(true);
    expect(result.utilisateur).toMatchObject({ telephone: PHONE, telephoneVerifie: true, profilIncomplet: true });
    expect(result.accessToken).toBe('access-1');
    expect(result.refreshToken).toBe('refresh-1');
    expect(users.rows).toHaveLength(1);
    expect(sessions.rows[0]?.jetonHash).toBe('hash:refresh-1');
    expect(otpCodes.rows[0]?.dateUtilisation).toEqual(NOW);
  });

  it('signs in an existing account without creating another one', async () => {
    const { useCase, users } = await setup(new InMemoryUsers(makeUser({ id: 7 })));

    const result = await useCase.execute(PHONE, '123456');

    expect(result.nouveau).toBe(false);
    expect(result.utilisateur).toMatchObject({ id: 7, profilIncomplet: false });
    expect(users.rows).toHaveLength(1);
  });

  it('counts wrong codes and blocks the code after 3 tries', async () => {
    const { useCase } = await setup();

    await expect(useCase.execute(PHONE, '000000')).rejects.toMatchObject({
      reason: 'invalid',
      details: { remainingAttempts: 2 },
    });
    await expect(useCase.execute(PHONE, '000000')).rejects.toMatchObject({ details: { remainingAttempts: 1 } });
    await expect(useCase.execute(PHONE, '000000')).rejects.toMatchObject({ reason: 'too_many_requests' });
    // Even the right code no longer works.
    await expect(useCase.execute(PHONE, '123456')).rejects.toMatchObject({ reason: 'too_many_requests' });
  });

  it('refuses an expired code', async () => {
    const { useCase, clock } = await setup();
    clock.advanceSeconds(5 * 60);

    await expect(useCase.execute(PHONE, '123456')).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('refuses a code already used', async () => {
    const { useCase } = await setup();
    await useCase.execute(PHONE, '123456');

    await expect(useCase.execute(PHONE, '123456')).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('refuses a suspended account with a clear message', async () => {
    const { useCase, sessions } = await setup(new InMemoryUsers(makeUser({ statut: 'suspendu' })));

    await expect(useCase.execute(PHONE, '123456')).rejects.toMatchObject({
      reason: 'forbidden',
      message: expect.stringContaining('suspendu'),
    });
    expect(sessions.rows).toHaveLength(0);
  });
});
