import { FakeAccessTokens, FixedClock } from '../../../support/inMemory';
import { InMemoryAdminAccounts, makeAdmin, PlainPasswordHasher } from '../../../support/inMemoryDriver';
import { AdminSignInUseCase } from '../../../../src/application/usecases/admin/AdminSignInUseCase';

function setup(account = makeAdmin({ email: 'admin@ndaohody.test', motDePasse: 'hashed:secret' })) {
  const accounts = new InMemoryAdminAccounts(account);
  const clock = new FixedClock();
  const useCase = new AdminSignInUseCase(accounts, new PlainPasswordHasher(), new FakeAccessTokens(), clock);
  return { useCase, accounts, clock };
}

describe('AdminSignInUseCase', () => {
  it('signs in with the right password, whatever the case of the e-mail', async () => {
    const { useCase } = setup();

    const result = await useCase.execute(' Admin@Ndaohody.TEST ', 'secret');

    expect(result.accessToken).toBe('access-1');
    expect(result.administrateur).not.toHaveProperty('motDePasse');
    expect(result.permissions).toContain('comptes.creer');
  });

  it('gives the same answer for an unknown e-mail and a wrong password', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('nobody@ndaohody.test', 'secret')).rejects.toMatchObject({ reason: 'unauthorized' });
    await expect(useCase.execute('admin@ndaohody.test', 'wrong')).rejects.toMatchObject({ reason: 'unauthorized' });
  });

  it('locks the account for 15 min after 5 wrong passwords', async () => {
    const { useCase, clock } = setup();
    for (let attempt = 1; attempt < 5; attempt += 1) {
      await expect(useCase.execute('admin@ndaohody.test', 'wrong')).rejects.toMatchObject({ reason: 'unauthorized' });
    }
    await expect(useCase.execute('admin@ndaohody.test', 'wrong')).rejects.toMatchObject({ reason: 'too_many_requests' });

    // Even the right password is refused while locked...
    await expect(useCase.execute('admin@ndaohody.test', 'secret')).rejects.toMatchObject({ reason: 'too_many_requests' });
    // ...and works again after 15 minutes.
    clock.advanceSeconds(15 * 60);
    await expect(useCase.execute('admin@ndaohody.test', 'secret')).resolves.toHaveProperty('accessToken');
  });

  it('refuses a deactivated account', async () => {
    const { useCase } = setup(makeAdmin({ email: 'admin@ndaohody.test', motDePasse: 'hashed:secret', actif: false }));

    await expect(useCase.execute('admin@ndaohody.test', 'secret')).rejects.toMatchObject({ reason: 'forbidden' });
  });
});
