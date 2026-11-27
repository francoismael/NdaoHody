import type { MiseAJourSuivi } from '@contract';
import { EtaService } from '../../../../src/application/service/EtaService';
import { TrackingService } from '../../../../src/application/service/TrackingService';
import { ShareDriverPositionUseCase } from '../../../../src/application/usecases/tracking/ShareDriverPositionUseCase';
import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';
import { FixedClock } from '../../../support/inMemory';
import { PARIS, StraightLineRoutes } from '../../../support/inMemoryGeo';

/** About 1 km before Tanjombato on the driver's way. */
const DRIVER_POSITION = { latitude: -18.97, longitude: 47.53 };

async function setup() {
  const rides = setupBookings();
  const tracking = new TrackingService(rides.trips, new EtaService(new StraightLineRoutes(), new FixedClock()));
  const share = new ShareDriverPositionUseCase(rides.trips, rides.bookings, rides.positions, tracking, rides.realtime, new FixedClock());
  const booking = await rides.request.create(PASSENGER, REQUEST);
  return { ...rides, share, booking };
}

describe('ShareDriverPositionUseCase', () => {
  it('saves the position and keeps the driver online while his trip is on the road', async () => {
    const { share, positions } = await setup();

    await share.execute(DRIVER, DRIVER_POSITION);

    expect(positions.saved.at(-1)).toMatchObject({ chauffeurId: 1, trajetId: 1, enLigne: true });
  });

  it('sends the accepted passenger and the driver the road to the pickup point and the minutes', async () => {
    const { share, answer, realtime, booking } = await setup();
    await answer.accept(DRIVER, booking.id);

    await share.execute(DRIVER, DRIVER_POSITION);

    const update = realtime.sent.find((sent) => sent.userId === 9 && sent.event === 'tracking-update')?.payload as MiseAJourSuivi;
    expect(update).toMatchObject({ reservationId: booking.id, positionChauffeur: DRIVER_POSITION, arriveeDansMinutes: 2 });
    expect(update.cheminVersPassager.length).toBeGreaterThanOrEqual(2);
    expect(update.distanceMetres).toBeGreaterThan(0);
    expect(realtime.eventsFor(1)).toContain('tracking-update');
  });

  it('sends nothing to a passenger whose request is still waiting', async () => {
    const { share, realtime } = await setup();

    await share.execute(DRIVER, DRIVER_POSITION);

    expect(realtime.eventsFor(9)).not.toContain('tracking-update');
  });

  it('refuses a position outside Madagascar', async () => {
    const { share } = await setup();

    await expect(share.execute(DRIVER, PARIS)).rejects.toMatchObject({ reason: 'invalid' });
  });
});
