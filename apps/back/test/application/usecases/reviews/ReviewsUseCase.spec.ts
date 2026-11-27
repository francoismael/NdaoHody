import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';

async function finishedRide() {
  const rides = setupBookings();
  const booking = await rides.request.create(PASSENGER, REQUEST);
  await rides.answer.accept(DRIVER, booking.id);
  await rides.ride.start(DRIVER, booking.id);
  await rides.ride.finish(DRIVER, booking.id);
  return { ...rides, booking };
}

describe('ReviewsUseCase', () => {
  it('the passenger rates his driver after the ride; the driver’s average is updated', async () => {
    const { reviews, users, booking } = await finishedRide();

    const review = await reviews.create(PASSENGER, { reservationId: booking.id, note: 4, commentaire: '  Très bien  ' });

    expect(review).toMatchObject({ auteurId: 9, cibleId: 1, note: 4, commentaire: 'Très bien' });
    expect(await users.findById(1)).toMatchObject({ noteMoyenne: 4, nombreNotes: 1 });
  });

  it('only once per ride', async () => {
    const { reviews, booking } = await finishedRide();
    await reviews.create(PASSENGER, { reservationId: booking.id, note: 5 });

    await expect(reviews.create(PASSENGER, { reservationId: booking.id, note: 3 })).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('only the passenger rates (the driver does not rate his passengers)', async () => {
    const { reviews, booking } = await finishedRide();

    await expect(reviews.create(DRIVER, { reservationId: booking.id, note: 5 })).rejects.toMatchObject({ reason: 'forbidden' });
  });

  it('not before the end of the ride', async () => {
    const rides = setupBookings();
    const booking = await rides.request.create(PASSENGER, REQUEST);

    await expect(rides.reviews.create(PASSENGER, { reservationId: booking.id, note: 5 })).rejects.toMatchObject({ reason: 'conflict' });
  });
});
