import { NOW } from '../../../support/inMemory';
import { DRIVER, PASSENGER, REQUEST, setupBookings, tripOne } from '../../../support/bookingSetup';

describe('RunRideJobsUseCase', () => {
  it('cancels a planned trip still not started 30 min after its time and tells the passengers', async () => {
    const { request, answer, jobs, trips, notifier } = setupBookings();
    const trip = await tripOne(trips);
    Object.assign(trip, { statut: 'publie', dateDepart: new Date(NOW.getTime() + 20 * 60_000).toISOString() });
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);
    trip.dateDepart = new Date(NOW.getTime() - 31 * 60_000).toISOString();

    await jobs.handleTrips();

    expect(trip.statut).toBe('annule');
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 9, type: 'trajet_annule' });
  });
});

describe('RunRideJobsUseCase: drivers without position', () => {
  it('a driver on the road without position for 2 min goes offline and is asked to turn his location on', async () => {
    const { jobs, positions, realtime, clock } = setupBookings();
    await positions.save(1, 1, { latitude: -18.97, longitude: 47.53 }, true, clock.now());
    clock.advanceSeconds(121);

    await expect(jobs.markDriversOffline()).resolves.toEqual([1]);

    expect((await positions.findByDriver(1))?.enLigne).toBe(false);
    expect(realtime.eventsFor(1)).toContain('location-required');
  });

  it('keeps a driver who sent his position less than 2 min ago', async () => {
    const { jobs, positions, clock } = setupBookings();
    await positions.save(1, 1, { latitude: -18.97, longitude: 47.53 }, true, clock.now());
    clock.advanceSeconds(90);

    await expect(jobs.markDriversOffline()).resolves.toEqual([]);
  });
});
