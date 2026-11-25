import { DeviceRegistry } from '../../../../src/application/port/DeviceRegistry';
import { FileStorage } from '../../../../src/application/port/FileStorage';
import { DirectUnitOfWork, FixedClock, InMemorySessions, InMemoryUsers, makeUser } from '../../../support/inMemory';
import { DeleteAccountUseCase } from '../../../../src/application/usecases/profile/DeleteAccountUseCase';

class FakeDevices extends DeviceRegistry {
  readonly unregistered: number[] = [];
  async register(): Promise<void> {
    // not used here
  }
  async unregister(): Promise<void> {
    // not used here
  }
  async unregisterAll(utilisateurId: number): Promise<void> {
    this.unregistered.push(utilisateurId);
  }
}

class FakeStorage extends FileStorage {
  readonly removed: string[] = [];
  async save(): Promise<string> {
    return 'unused';
  }
  async remove(url: string): Promise<void> {
    this.removed.push(url);
  }
}

function setup(user = makeUser({ photoUrl: 'http://localhost:3000/uploads/photos/a.jpg' })) {
  const users = new InMemoryUsers(user);
  const sessions = new InMemorySessions();
  const devices = new FakeDevices();
  const storage = new FakeStorage();
  const useCase = new DeleteAccountUseCase(users, sessions, devices, storage, new DirectUnitOfWork(), new FixedClock());
  return { useCase, user, users, sessions, devices, storage };
}

describe('DeleteAccountUseCase', () => {
  it('soft-deletes the account, frees the number and closes everything', async () => {
    const { useCase, user, users, sessions, devices, storage } = setup();
    await sessions.create({ utilisateurId: user.id, jetonHash: 'h', dateExpiration: new Date(), dateCreation: new Date() });

    await useCase.execute(user);

    expect(users.rows[0]).toMatchObject({ statut: 'supprime', telephone: 'supprime:1', photoUrl: null });
    expect(sessions.rows[0]?.dateRevocation).not.toBeNull();
    expect(devices.unregistered).toEqual([1]);
    expect(storage.removed).toEqual(['http://localhost:3000/uploads/photos/a.jpg']);
  });

  it('is refused during a ride', async () => {
    const { useCase, user, users } = setup();
    users.ridesInProgress.add(user.id);

    await expect(useCase.execute(user)).rejects.toMatchObject({ reason: 'conflict' });
    expect(users.rows[0]?.statut).toBe('actif');
  });
});
