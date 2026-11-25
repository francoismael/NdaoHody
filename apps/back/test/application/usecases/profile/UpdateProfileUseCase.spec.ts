import { InMemoryUsers, makeUser } from '../../../support/inMemory';
import { UpdateProfileUseCase } from '../../../../src/application/usecases/profile/UpdateProfileUseCase';

const NEW_ACCOUNT = makeUser({ nom: null, prenom: null, sexe: null });

describe('UpdateProfileUseCase', () => {
  it('completes a new account sent with last name, first name and sex', async () => {
    const useCase = new UpdateProfileUseCase(new InMemoryUsers(NEW_ACCOUNT));

    const result = await useCase.execute(NEW_ACCOUNT, { nom: 'Rasoa', prenom: 'Lova', sexe: 'femme' });

    expect(result).toMatchObject({ nom: 'Rasoa', prenom: 'Lova', sexe: 'femme', profilIncomplet: false });
  });

  it('refuses to leave a new account incomplete', async () => {
    const useCase = new UpdateProfileUseCase(new InMemoryUsers(NEW_ACCOUNT));

    await expect(useCase.execute(NEW_ACCOUNT, { prenom: 'Lova' })).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('lets a complete account change one field', async () => {
    const user = makeUser();
    const useCase = new UpdateProfileUseCase(new InMemoryUsers(user));

    await expect(useCase.execute(user, { prenom: 'Fidy' })).resolves.toMatchObject({ prenom: 'Fidy', nom: 'Rakoto' });
  });

  it('refuses to change the sex once set', async () => {
    const user = makeUser({ sexe: 'homme' });
    const useCase = new UpdateProfileUseCase(new InMemoryUsers(user));

    await expect(useCase.execute(user, { sexe: 'femme' })).rejects.toMatchObject({ reason: 'forbidden' });
  });
});
