import { makeMatch } from '../../../support/inMemoryRides';
import { makeUser, NOW } from '../../../support/inMemory';
import { PASSENGER, REQUEST, setupBookings, expire, tripOne } from '../../../support/bookingSetup';

describe('RequestBookingUseCase', () => {
  it('computes the price on the server, freezes it, and gives the driver 3 minutes', async () => {
    const { request, notifier } = setupBookings();

    const booking = await request.create(PASSENGER, REQUEST);

    expect(booking).toMatchObject({ statut: 'en_attente', places: 2, distanceMetres: 12_000, prixParPlace: 3600, prixTotal: 7200 });
    expect(booking.dateExpiration).toBe(new Date(NOW.getTime() + 180_000).toISOString());
    expect(notifier.sent[0]).toMatchObject({ utilisateurId: 1, type: 'nouvelle_demande' });
  });

  it('refuses an incomplete profile', async () => {
    const { request } = setupBookings();

    await expect(request.create(makeUser({ id: 9, nom: null }), REQUEST)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('refuses a women-only trip to a man, even through the API', async () => {
    const { request, trips } = setupBookings();
    (await tripOne(trips)).reserveFemmes = true;

    await expect(request.create(makeUser({ id: 9, sexe: 'homme' }), REQUEST)).rejects.toMatchObject({ reason: 'forbidden' });
    await expect(request.create(makeUser({ id: 10, sexe: 'femme', telephone: '+261340000010' }), REQUEST)).resolves.toBeDefined();
  });

  it('refuses more seats than are free, a blocked user, and points off the driver’s way', async () => {
    await expect(setupBookings({ placesLibres: 1 }).request.create(PASSENGER, REQUEST)).rejects.toMatchObject({ reason: 'conflict' });
    await expect(setupBookings({ blocked: true }).request.create(PASSENGER, REQUEST)).rejects.toMatchObject({ reason: 'forbidden' });

    const offRoute = setupBookings();
    offRoute.trips.matches = [];
    await expect(offRoute.request.create(PASSENGER, REQUEST)).rejects.toMatchObject({ reason: 'invalid' });
  });

  it('refuses when the driver already passed the pickup point', async () => {
    const { request, trips } = setupBookings();
    trips.matches = [makeMatch({ tripId: 1, fractionChauffeur: 0.6, fractionPriseEnCharge: 0.3 })];

    await expect(request.create(PASSENGER, REQUEST)).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('lets a passenger re-send an expired request 2 times, not more', async () => {
    const { request, bookings } = setupBookings();
    let booking = await request.create(PASSENGER, REQUEST);
    for (let retry = 0; retry < 2; retry += 1) {
      expire(bookings, booking.id);
      booking = await request.retry(PASSENGER, booking.id);
    }
    expire(bookings, booking.id);

    await expect(request.retry(PASSENGER, booking.id)).rejects.toMatchObject({ reason: 'too_many_requests' });
  });
});
