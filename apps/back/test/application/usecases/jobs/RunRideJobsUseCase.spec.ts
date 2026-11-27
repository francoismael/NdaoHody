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

describe('RunRideJobsUseCase: arrival and reviews', () => {
  it('tells the driver when his 10-minute wait is over', async () => {
    const { request, answer, ride, jobs, positions, clock, notifier } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);
    await positions.save(1, 1, { latitude: -18.9609, longitude: 47.528 }, true, clock.now());
    await ride.onSite(DRIVER, booking.id);
    clock.advanceSeconds(10 * 60 + 5);

    await jobs.announceWaitEnded();

    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 1, type: 'attente_terminee' });
  });

  it('reminds the passenger to rate his driver 1 h after the ride', async () => {
    const { request, answer, ride, jobs, clock, notifier } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);
    await ride.start(DRIVER, booking.id);
    await ride.finish(DRIVER, booking.id);
    clock.advanceSeconds(60 * 60 + 30);

    await jobs.handleTrips();

    expect(notifier.sent.some((sent) => sent.utilisateurId === 9 && sent.type === 'demande_avis')).toBe(true);
  });
});
