import { SessionIssuerService } from '../../../../src/application/service/SessionIssuerService';
import {
  DirectUnitOfWork,
  FakeAccessTokens,
  FixedClock,
  InMemorySessions,
  InMemoryUsers,
  makeUser,
  PlainHasher,
  PredictableRandom,
} from '../../../support/inMemory';
import { RefreshSessionUseCase } from '../../../../src/application/usecases/auth/RefreshSessionUseCase';
import { SignOutUseCase } from '../../../../src/application/usecases/auth/SignOutUseCase';

async function setup(users = new InMemoryUsers(makeUser())) {
  const sessions = new InMemorySessions();
  const clock = new FixedClock();
  const hasher = new PlainHasher();
  const issuer = new SessionIssuerService(sessions, hasher, new PredictableRandom(), new FakeAccessTokens(), clock);
  const refresh = new RefreshSessionUseCase(sessions, users, hasher, issuer, new DirectUnitOfWork(), clock);
  const signOut = new SignOutUseCase(sessions, hasher, clock);
  const first = await issuer.issue(1);
  return { refresh, signOut, sessions, clock, refreshToken: first.refreshToken };
}

describe('RefreshSessionUseCase', () => {
  it('gives new tokens and closes the old session (rotation)', async () => {
    const { refresh, sessions, refreshToken } = await setup();

    const result = await refresh.execute(refreshToken);

    expect(result.refreshToken).toBe('refresh-2');
    expect(sessions.rows[0]?.dateRevocation).not.toBeNull();
    expect(sessions.rows[1]?.dateRevocation).toBeNull();
  });

  it('closes every session when a used refresh token comes back', async () => {
    const { refresh, sessions, refreshToken } = await setup();
    await refresh.execute(refreshToken);

    await expect(refresh.execute(refreshToken)).rejects.toMatchObject({ reason: 'unauthorized' });
    expect(sessions.rows.every((session) => session.dateRevocation !== null)).toBe(true);
  });

  it('refuses an expired refresh token', async () => {
    const { refresh, clock, refreshToken } = await setup();
    clock.advanceSeconds(31 * 24 * 3600);

    await expect(refresh.execute(refreshToken)).rejects.toMatchObject({ reason: 'unauthorized' });
  });

  it('refuses a suspended account', async () => {
    const { refresh, refreshToken } = await setup(new InMemoryUsers(makeUser({ statut: 'suspendu' })));

    await expect(refresh.execute(refreshToken)).rejects.toMatchObject({ reason: 'forbidden' });
  });

  it('no longer works after sign-out', async () => {
    const { refresh, signOut, refreshToken } = await setup();
    await signOut.execute(refreshToken);

    await expect(refresh.execute(refreshToken)).rejects.toMatchObject({ reason: 'unauthorized' });
  });
});
