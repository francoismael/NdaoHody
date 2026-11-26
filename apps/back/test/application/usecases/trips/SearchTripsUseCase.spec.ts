import type { SearchTripsRequest } from '../../../../src/application/dto/TripRequests';
import { SearchTripsUseCase, timingOf } from '../../../../src/application/usecases/trips/SearchTripsUseCase';
import { FixedClock, InMemorySettings, InMemoryUsers, makeUser, NOW } from '../../../support/inMemory';
import { InMemoryVehicles, makeVehicle } from '../../../support/inMemoryDriver';
import { FixedTariffs, InMemoryTrips, makeMatch, makeTrip } from '../../../support/inMemoryRides';

const PASSENGER = makeUser({ id: 9, sexe: 'femme' });
const SEARCH: SearchTripsRequest = {
  depart: { libelle: 'Tanjombato', latitude: -18.96, longitude: 47.528 },
  destination: { libelle: 'Analakely', latitude: -18.9067, longitude: 47.5253 },
  places: 2,
  quand: 'maintenant',
};
const minutesFromNow = (minutes: number): string => new Date(NOW.getTime() + minutes * 60_000).toISOString();

describe('timingOf', () => {
  const ROAD_TRIP = makeTrip({ statut: 'en_route', dureeSecondes: 1800 });

  it('gives the minutes before a driver on the road reaches the pickup point', () => {
    // From 10 % to 30 % of a 30 min trip: 6 min.
    expect(timingOf(ROAD_TRIP, makeMatch({ fractionChauffeur: 0.1, fractionPriseEnCharge: 0.3 }), NOW, NOW)).toMatchObject({
      arriveeDansMinutes: 6,
      heurePassage: null,
    });
  });

  it('skips a driver already past the pickup point, or without position', () => {
    expect(timingOf(ROAD_TRIP, makeMatch({ fractionChauffeur: 0.5, fractionPriseEnCharge: 0.3 }), NOW, NOW)).toBeNull();
    expect(timingOf(ROAD_TRIP, makeMatch({ fractionChauffeur: null }), NOW, NOW)).toBeNull();
  });

  it('keeps a planned trip passing by the pickup point from 15 min before to 60 min after the wanted time', () => {
    const planned = makeTrip({ statut: 'publie', dateDepart: minutesFromNow(120), dureeSecondes: 1800 });
    const match = makeMatch({ fractionPriseEnCharge: 0 }); // passes at +120 min

    expect(timingOf(planned, match, NOW, new Date(NOW.getTime() + 100 * 60_000))).not.toBeNull(); // 20 min after
    expect(timingOf(planned, match, NOW, new Date(NOW.getTime() + 130 * 60_000))).not.toBeNull(); // 10 min before
    expect(timingOf(planned, match, NOW, new Date(NOW.getTime() + 140 * 60_000))).toBeNull(); // 20 min before: too early
    expect(timingOf(planned, match, NOW, NOW)).toBeNull(); // 2 h later than wanted: too late
  });
});

describe('SearchTripsUseCase', () => {
  function setup() {
    const trips = new InMemoryTrips(
      makeTrip({ id: 1, chauffeurId: 1, vehiculeId: 1 }),
      makeTrip({ id: 2, chauffeurId: 2, vehiculeId: 2 }),
      makeTrip({ id: 3, chauffeurId: 3, vehiculeId: 3 }),
    );
    trips.matches = [
      makeMatch({ tripId: 1, fractionChauffeur: 0.1 }),
      makeMatch({ tripId: 2, fractionChauffeur: 0.25 }),
      makeMatch({ tripId: 3, fractionChauffeur: 0.2 }),
    ];
    const users = new InMemoryUsers(
      makeUser({ id: 1, prenom: 'Non noté', noteMoyenne: null, telephone: '+261340000001' }),
      makeUser({ id: 2, prenom: 'Bien noté', noteMoyenne: 4.9, telephone: '+261340000002' }),
      makeUser({ id: 3, prenom: 'Moyen', noteMoyenne: 4.1, telephone: '+261340000003' }),
      PASSENGER,
    );
    const vehicles = new InMemoryVehicles(
      makeVehicle({ id: 1, utilisateurId: 1 }),
      makeVehicle({ id: 2, utilisateurId: 2, immatriculation: '2222 TBA' }),
      makeVehicle({ id: 3, utilisateurId: 3, type: 'moto', places: 1, immatriculation: '3333 TBA' }),
    );
    const useCase = new SearchTripsUseCase(trips, users, vehicles, new FixedTariffs(), new InMemorySettings(), new FixedClock());
    return { useCase, trips };
  }

  it('puts rated drivers first (best first), then the others', async () => {
    const { useCase } = setup();

    const results = await useCase.execute(PASSENGER, SEARCH);

    expect(results.map((result) => result.chauffeur.prenom)).toEqual(['Bien noté', 'Moyen', 'Non noté']);
  });

  it('gives the price per seat and the total, by vehicle type, and never the phone number', async () => {
    const { useCase } = setup();

    const [best, , unrated] = await useCase.execute(PASSENGER, SEARCH);

    expect(unrated).toMatchObject({ distanceMetres: 12_000, prixParPlace: 3600, prixTotal: 7200 }); // car
    expect(best?.priseEnCharge.libelle).toBe('Tanjombato');
    expect(JSON.stringify(best?.chauffeur)).not.toContain('+261');
  });

  it('asks the database with the passenger, the 30 m margin and the women-only choice', async () => {
    const { useCase, trips } = setup();

    await useCase.execute(PASSENGER, { ...SEARCH, femmesSeulement: true });

    expect(trips.lastCriteria).toMatchObject({ passagerId: 9, margeMetres: 30, passagerEstUneFemme: true, femmesSeulement: true });
  });

  it('ignores "women only" for a man', async () => {
    const { useCase, trips } = setup();

    await useCase.execute(makeUser({ id: 8, sexe: 'homme' }), { ...SEARCH, femmesSeulement: true });

    expect(trips.lastCriteria).toMatchObject({ passagerEstUneFemme: false, femmesSeulement: false });
  });
});
