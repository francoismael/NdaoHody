import { deletedPhoneNumber } from '../../../../src/domain/entity/User';
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
import { IMAGE, InMemoryVehicles, makeVehicle, MemoryFileStorage, PassThroughImages } from '../../../support/inMemoryDriver';
import type { AddVehicleRequest } from '../../../../src/application/dto/DriverRequests';
import { AccountRecoveryService } from '../../../../src/application/service/AccountRecoveryService';
import { SessionIssuerService } from '../../../../src/application/service/SessionIssuerService';
import { AddVehicleUseCase } from '../../../../src/application/usecases/driver/AddVehicleUseCase';

const CAR: AddVehicleRequest = { type: 'voiture', couleur: 'Gris', immatriculation: '1234tba', places: 4 };

function setup(users: InMemoryUsers, vehicles = new InMemoryVehicles()) {
  const sessions = new InMemorySessions();
  const clock = new FixedClock();
  const issuer = new SessionIssuerService(sessions, new PlainHasher(), new PredictableRandom(), new FakeAccessTokens(), clock);
  const useCase = new AddVehicleUseCase(
    users,
    vehicles,
    new PassThroughImages(),
    new MemoryFileStorage(),
    new AccountRecoveryService(users, sessions, issuer, clock),
    new DirectUnitOfWork(),
  );
  return { useCase, vehicles };
}

describe('AddVehicleUseCase', () => {
  it('adds the first vehicle as default, waiting for validation', async () => {
    const driver = makeUser({ id: 5 });
    const { useCase } = setup(new InMemoryUsers(driver));

    const { vehicule, compteReactive } = await useCase.execute(driver, CAR, IMAGE);

    expect(compteReactive).toBeNull();
    expect(vehicule).toMatchObject({ immatriculation: '1234 TBA', parDefaut: true, statut: 'en_attente' });
  });

  it('refuses a motorbike with more than 1 seat', async () => {
    const driver = makeUser({ id: 5 });
    const { useCase } = setup(new InMemoryUsers(driver));

    await expect(useCase.execute(driver, { ...CAR, type: 'moto', places: 2 }, IMAGE)).rejects.toMatchObject({
      reason: 'invalid',
    });
  });

  it('reactivates the deleted account that owns the plate, and gives it the vehicle back', async () => {
    const previous = makeUser({ id: 7, statut: 'supprime', telephone: deletedPhoneNumber(7), coursesChauffeur: 30 });
    const current = makeUser({ id: 50, telephone: '+261329999999' });
    const vehicles = new InMemoryVehicles(makeVehicle({ id: 3, utilisateurId: 7, immatriculation: '1234 TBA' }));
    const { useCase } = setup(new InMemoryUsers(previous, current), vehicles);

    const { vehicule, compteReactive } = await useCase.execute(current, CAR, IMAGE);

    expect(compteReactive?.utilisateur).toMatchObject({ id: 7, statut: 'actif', telephone: '+261329999999' });
    // Same row: the trips made with this plate stay attached to it. Checked again by an admin.
    expect(vehicule).toMatchObject({ id: 3, utilisateurId: 7, statut: 'en_attente' });
    expect(vehicles.rows).toHaveLength(1);
  });

  it('refuses a plate of another account still in use', async () => {
    const other = makeUser({ id: 7, telephone: '+261340000007' });
    const current = makeUser({ id: 50, telephone: '+261329999999' });
    const vehicles = new InMemoryVehicles(makeVehicle({ utilisateurId: 7 }));
    const { useCase } = setup(new InMemoryUsers(other, current), vehicles);

    await expect(useCase.execute(current, CAR, IMAGE)).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('brings back an archived vehicle of the same driver', async () => {
    const driver = makeUser({ id: 5 });
    const vehicles = new InMemoryVehicles(makeVehicle({ id: 3, utilisateurId: 5, statut: 'archive', parDefaut: false }));
    const { useCase } = setup(new InMemoryUsers(driver), vehicles);

    const { vehicule } = await useCase.execute(driver, CAR, IMAGE);

    expect(vehicule).toMatchObject({ id: 3, statut: 'en_attente', parDefaut: true });
  });
});
