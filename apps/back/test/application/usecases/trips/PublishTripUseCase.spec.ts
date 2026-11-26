import type { PublishTripRequest } from '../../../../src/application/dto/TripRequests';
import { PreviewRouteUseCase } from '../../../../src/application/usecases/geo/PreviewRouteUseCase';
import { PublishTripUseCase } from '../../../../src/application/usecases/trips/PublishTripUseCase';
import { DirectUnitOfWork, FixedClock, InMemorySettings, makeUser, NOW } from '../../../support/inMemory';
import { InMemoryVehicles, makeVehicle } from '../../../support/inMemoryDriver';
import { ANALAKELY, ANDOHARANOFOTSY, StraightLineRoutes } from '../../../support/inMemoryGeo';
import { InMemoryTrips, makeTrip, RecordedPositions } from '../../../support/inMemoryRides';

const DRIVER = makeUser({ id: 1, statutChauffeur: 'valide', sexe: 'homme' });
const IMMEDIATE: PublishTripRequest = {
  type: 'immediat',
  depart: { libelle: 'Andoharanofotsy', ...ANDOHARANOFOTSY },
  arrivee: { libelle: 'Analakely', ...ANALAKELY },
  placesTotal: 3,
};
const inHours = (hours: number): string => new Date(NOW.getTime() + hours * 3600_000).toISOString();

function setup(trips = new InMemoryTrips(), vehicles = new InMemoryVehicles(makeVehicle({ id: 1, utilisateurId: 1, places: 4, parDefaut: true, statut: 'valide' }))) {
  const positions = new RecordedPositions();
  const useCase = new PublishTripUseCase(
    trips,
    vehicles,
    positions,
    new InMemorySettings({ trajet_max_jours_avance: 15 }),
    new PreviewRouteUseCase(new StraightLineRoutes()),
    new DirectUnitOfWork(),
    new FixedClock(),
  );
  return { useCase, trips, positions };
}

describe('PublishTripUseCase', () => {
  it('publishes an immediate trip on the road, with the road computed by the server', async () => {
    const { useCase, positions } = setup();

    const trip = await useCase.execute(DRIVER, IMMEDIATE);

    expect(trip).toMatchObject({ statut: 'en_route', placesTotal: 3, placesLibres: 3, vehiculeId: 1, distanceMetres: 1000 });
    expect(trip.chemin.length).toBeGreaterThanOrEqual(2);
    expect(positions.saved[0]).toMatchObject({ chauffeurId: 1, trajetId: trip.id });
  });

  it('publishes a trip planned ahead', async () => {
    const { useCase } = setup();

    const trip = await useCase.execute(DRIVER, { ...IMMEDIATE, type: 'a_l_avance', dateDepart: inHours(24) });

    expect(trip).toMatchObject({ statut: 'publie', dateDepart: inHours(24) });
  });

  it('refuses a driver not validated yet', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(makeUser({ id: 1, statutChauffeur: 'en_attente' }), IMMEDIATE)).rejects.toMatchObject({
      reason: 'forbidden',
    });
  });

  it('lets only a woman driver publish a women-only trip', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(DRIVER, { ...IMMEDIATE, reserveFemmes: true })).rejects.toMatchObject({ reason: 'forbidden' });
    const woman = { ...DRIVER, sexe: 'femme' as const };
    await expect(useCase.execute(woman, { ...IMMEDIATE, reserveFemmes: true })).resolves.toMatchObject({ reserveFemmes: true });
  });

  it('refuses more seats than the vehicle has', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(DRIVER, { ...IMMEDIATE, placesTotal: 5 })).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('refuses a trip more than 15 days ahead, or in less than 15 minutes', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(DRIVER, { ...IMMEDIATE, type: 'a_l_avance', dateDepart: inHours(16 * 24) })).rejects.toMatchObject({
      reason: 'invalid',
    });
    await expect(useCase.execute(DRIVER, { ...IMMEDIATE, type: 'a_l_avance', dateDepart: inHours(0.1) })).rejects.toMatchObject({
      reason: 'invalid',
    });
  });

  it('refuses a second trip on the road, or two planned trips at the same time', async () => {
    const { useCase } = setup(new InMemoryTrips(makeTrip({ chauffeurId: 1, statut: 'en_route' })));
    await expect(useCase.execute(DRIVER, IMMEDIATE)).rejects.toMatchObject({ reason: 'conflict' });

    const planned = setup(new InMemoryTrips(makeTrip({ chauffeurId: 1, statut: 'publie', dateDepart: inHours(24) })));
    await expect(
      planned.useCase.execute(DRIVER, { ...IMMEDIATE, type: 'a_l_avance', dateDepart: inHours(24.1) }),
    ).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('uses the only validated vehicle without asking (a vehicle still waiting does not count)', async () => {
    const { useCase } = setup(
      new InMemoryTrips(),
      new InMemoryVehicles(
        makeVehicle({ id: 1, utilisateurId: 1, places: 4, statut: 'valide' }),
        makeVehicle({ id: 2, utilisateurId: 1, type: 'moto', places: 1, immatriculation: '2222 TBA', statut: 'en_attente' }),
      ),
    );

    await expect(useCase.execute(DRIVER, IMMEDIATE)).resolves.toMatchObject({ vehiculeId: 1 });
  });

  it('asks the driver to choose when he has several validated vehicles', async () => {
    const twoVehicles = () =>
      new InMemoryVehicles(
        makeVehicle({ id: 1, utilisateurId: 1, places: 4, statut: 'valide' }),
        makeVehicle({ id: 2, utilisateurId: 1, type: 'moto', places: 1, immatriculation: '2222 TBA', statut: 'valide' }),
      );

    const { useCase } = setup(new InMemoryTrips(), twoVehicles());
    await expect(useCase.execute(DRIVER, IMMEDIATE)).rejects.toMatchObject({
      reason: 'invalid',
      details: { vehicules: [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })] },
    });

    const chosen = setup(new InMemoryTrips(), twoVehicles());
    await expect(chosen.useCase.execute(DRIVER, { ...IMMEDIATE, placesTotal: 1, vehiculeId: 2 })).resolves.toMatchObject({ vehiculeId: 2 });
  });

  it('refuses a driver without any validated vehicle', async () => {
    const { useCase } = setup(new InMemoryTrips(), new InMemoryVehicles(makeVehicle({ id: 1, utilisateurId: 1, statut: 'en_attente' })));

    await expect(useCase.execute(DRIVER, IMMEDIATE)).rejects.toMatchObject({ reason: 'forbidden' });
  });
});
