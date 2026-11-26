import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';

describe('ManageBookingsUseCase', () => {
  it('the passenger can cancel before the driver answers', async () => {
    const { request, manage, notifier } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);

    await expect(manage.cancel(PASSENGER, booking.id)).resolves.toMatchObject({ statut: 'annulee_passager' });
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 1, type: 'reservation_annulee' });
  });

  it('the passenger can no longer cancel once the driver accepted', async () => {
    const { request, answer, manage } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);

    await expect(manage.cancel(PASSENGER, booking.id)).rejects.toMatchObject({ reason: 'conflict' });
  });

  it('the driver can cancel an accepted passenger: the seats go back to the trip', async () => {
    const { request, answer, manage, trips, notifier } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    await answer.accept(DRIVER, booking.id);

    await expect(manage.cancel(DRIVER, booking.id)).resolves.toMatchObject({ statut: 'annulee_chauffeur' });
    expect((await trips.findById(1))?.placesLibres).toBe(4);
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 9, type: 'reservation_annulee' });
  });
});
