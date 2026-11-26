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
