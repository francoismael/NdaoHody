import { EtaService } from '../../../src/application/service/EtaService';
import { TrackingService } from '../../../src/application/service/TrackingService';
import { DRIVER, PASSENGER, REQUEST, setupBookings, tripOne } from '../../support/bookingSetup';
import { FixedClock, InMemorySettings } from '../../support/inMemory';
import { StraightLineRoutes } from '../../support/inMemoryGeo';

describe('TrackingService', () => {
  it('lets the driver say "Je suis sur place" only within 500 m of the pickup point', async () => {
    const { request, answer, trips } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    const acceptedBooking = await answer.accept(DRIVER, booking.id);
    const trip = await tripOne(trips);
    const tracking = new TrackingService(trips, new EtaService(new StraightLineRoutes(), new FixedClock()), new InMemorySettings());
    const asBooking = { ...acceptedBooking, motifRefus: null };

    const near = await tracking.update(trip, asBooking, { latitude: -18.9609, longitude: 47.528 });
    const far = await tracking.update(trip, asBooking, { latitude: -18.978, longitude: 47.532 });

    expect(near.peutSignalerSurPlace).toBe(true);
    expect(far.peutSignalerSurPlace).toBe(false);
  });
});
