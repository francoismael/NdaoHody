import { SharePassengerPositionUseCase } from '../../../../src/application/usecases/tracking/SharePassengerPositionUseCase';
import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';
import { FixedClock, makeUser } from '../../../support/inMemory';

const HERE = { latitude: -18.96, longitude: 47.528 };

describe('SharePassengerPositionUseCase', () => {
  it('sends the passenger’s position to his driver once accepted', async () => {
    const { request, answer, bookings, trips, realtime } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);
    const share = new SharePassengerPositionUseCase(bookings, trips, realtime, new FixedClock());

    await share.execute(PASSENGER, booking.id, HERE);

    expect(realtime.sent.at(-1)).toMatchObject({ userId: 1, event: 'passenger-position', payload: { reservationId: booking.id, ...HERE } });
  });

  it('refuses before acceptance, and for someone else’s booking', async () => {
    const { request, bookings, trips, realtime } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    const share = new SharePassengerPositionUseCase(bookings, trips, realtime, new FixedClock());

    await expect(share.execute(PASSENGER, booking.id, HERE)).rejects.toMatchObject({ reason: 'conflict' });
    await expect(share.execute(makeUser({ id: 50 }), booking.id, HERE)).rejects.toMatchObject({ reason: 'not_found' });
  });
});
