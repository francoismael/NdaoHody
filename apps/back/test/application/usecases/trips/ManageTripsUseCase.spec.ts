import { DRIVER, PASSENGER, REQUEST, setupBookings, tripOne } from '../../../support/bookingSetup';

describe('ManageTripsUseCase — finish the trip', () => {
  it('refuses while a passenger is still to pick up or on board', async () => {
    const { request, answer, tripsUseCase } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);

    await expect(tripsUseCase.finish(DRIVER, 1)).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('ends the trip once every ride is over; the driver goes offline', async () => {
    const { request, answer, ride, tripsUseCase, trips, positions } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);
    await ride.start(DRIVER, booking.id);
    await ride.finish(DRIVER, booking.id);

    await expect(tripsUseCase.finish(DRIVER, 1)).resolves.toMatchObject({ statut: 'termine' });
    expect((await tripOne(trips)).dateFin).not.toBeNull();
    expect(positions.saved.at(-1)).toMatchObject({ chauffeurId: 1, trajetId: null, enLigne: false });
  });
});
