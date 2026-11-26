import type { CreateAdminAccountRequest } from '../../../../src/application/dto/AdminRequests';
import { FixedClock, PredictableRandom } from '../../../support/inMemory';
import { InMemoryAdminAccounts, makeAdmin, PlainPasswordHasher } from '../../../support/inMemoryDriver';
import { ManageAdminAccountsUseCase } from '../../../../src/application/usecases/admin/ManageAdminAccountsUseCase';

const SUPER_ADMIN = makeAdmin({ id: 1, role: 'super_admin' });

function setup(...others: ReturnType<typeof makeAdmin>[]) {
  const accounts = new InMemoryAdminAccounts(SUPER_ADMIN, ...others);
  const useCase = new ManageAdminAccountsUseCase(accounts, new PlainPasswordHasher(), new PredictableRandom(), new FixedClock());
  return { useCase, accounts };
}

describe('ManageAdminAccountsUseCase', () => {
  it('creates an investisseur account with a temporary password', async () => {
    const { useCase, accounts } = setup();

    const result = await useCase.create(SUPER_ADMIN, { nomComplet: 'Invest', email: 'Invest@Ndaohody.mg', role: 'investisseur' });

    expect(result.motDePasseTemporaire).toBe('temporary-password');
    expect(result.administrateur).toMatchObject({ email: 'invest@ndaohody.mg', role: 'investisseur', creePar: 1 });
    expect(accounts.rows[1]?.motDePasse).toBe('hashed:temporary-password');
  });

  it('never creates a super admin from the back-office, even if the request gets past validation', async () => {
    const { useCase } = setup();
    // The type forbids it; the use case checks it again at runtime.
    const request = { nomComplet: 'Other', email: 'other@ndaohody.mg', role: 'super_admin' } as unknown as CreateAdminAccountRequest;

    await expect(useCase.create(SUPER_ADMIN, request)).rejects.toMatchObject({ reason: 'forbidden' });
  });

  it('refuses an e-mail already used', async () => {
    const { useCase } = setup(makeAdmin({ id: 2, role: 'admin', email: 'admin@ndaohody.mg' }));

    await expect(
      useCase.create(SUPER_ADMIN, { nomComplet: 'Admin', email: 'admin@ndaohody.mg', role: 'admin' }),
    ).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('deactivates an admin but never a super admin', async () => {
    const { useCase } = setup(makeAdmin({ id: 2, role: 'admin', email: 'admin@ndaohody.mg' }));

    await expect(useCase.setActive(2, false)).resolves.toMatchObject({ actif: false });
    await expect(useCase.setActive(1, false)).rejects.toMatchObject({ reason: 'forbidden' });
  });

  it('resets the password and unlocks the account', async () => {
    const locked = makeAdmin({ id: 2, role: 'admin', email: 'admin@ndaohody.mg', bloqueJusqua: new Date(), echecsConnexion: 4 });
    const { useCase, accounts } = setup(locked);

    await useCase.resetPassword(2);

    expect(accounts.rows[1]).toMatchObject({ motDePasse: 'hashed:temporary-password', bloqueJusqua: null, echecsConnexion: 0 });
  });
});
