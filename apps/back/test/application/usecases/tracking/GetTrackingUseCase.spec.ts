import { EtaService } from '../../../../src/application/service/EtaService';
import { TrackingService } from '../../../../src/application/service/TrackingService';
import { GetTrackingUseCase } from '../../../../src/application/usecases/tracking/GetTrackingUseCase';
import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';
import { FixedClock, InMemoryUsers, makeUser } from '../../../support/inMemory';
import { InMemoryVehicles, makeVehicle } from '../../../support/inMemoryDriver';
import { StraightLineRoutes } from '../../../support/inMemoryGeo';

function setup() {
  const rides = setupBookings();
  const users = new InMemoryUsers(
    makeUser({ id: 1, prenom: 'Andry', telephone: '+261340000003' }),
    makeUser({ id: 9, prenom: 'Zo', telephone: '+261340000011' }),
  );
  const tracking = new TrackingService(rides.trips, new EtaService(new StraightLineRoutes(), new FixedClock()));
  const getTracking = new GetTrackingUseCase(
    rides.bookings,
    rides.trips,
    users,
    new InMemoryVehicles(makeVehicle({ id: 1, utilisateurId: 1 })),
    rides.positions,
    tracking,
  );
  return { ...rides, getTracking };
}

describe('GetTrackingUseCase', () => {
  it('gives the whole tracking screen once accepted, with both phone numbers', async () => {
    const { request, answer, getTracking } = setup();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);

    const suivi = await getTracking.execute(PASSENGER, booking.id);

    expect(suivi.chauffeur).toMatchObject({ prenom: 'Andry', telephone: '+261340000003' });
    expect(suivi.passager).toMatchObject({ prenom: 'Zo', telephone: '+261340000011' });
    expect(suivi.reservation.statut).toBe('acceptee');
    expect(suivi.arriveeDansMinutes).toBeGreaterThanOrEqual(1);
  });

  it('starts only after acceptance (phone numbers stay hidden before)', async () => {
    const { request, getTracking } = setup();
    const booking = await request.create(PASSENGER, REQUEST);

    await expect(getTracking.execute(PASSENGER, booking.id)).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('is only for the passenger and the driver of the trip', async () => {
    const { request, answer, getTracking } = setup();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);

    await expect(getTracking.execute(makeUser({ id: 50 }), booking.id)).rejects.toMatchObject({ reason: 'not_found' });
  });
});
