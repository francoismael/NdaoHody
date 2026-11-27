import { makeUser } from '../../../support/inMemory';
import { DRIVER, PASSENGER, REQUEST, setupBookings } from '../../../support/bookingSetup';

describe('AnswerBookingUseCase', () => {
  it('accepting takes the seats and opens the chat', async () => {
    const { request, answer, trips, conversations } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);

    await expect(answer.accept(DRIVER, booking.id)).resolves.toMatchObject({ statut: 'acceptee' });
    expect((await trips.findById(1))?.placesLibres).toBe(2);
    expect(conversations.opened).toEqual([booking.id]);
  });

  it('two requests on the last seat: only the first acceptation succeeds', async () => {
    const { request, answer, trips } = setupBookings({ placesLibres: 1 });
    const first = await request.create(PASSENGER, { ...REQUEST, places: 1 });
    const second = await request.create(makeUser({ id: 10, telephone: '+261340000010' }), { ...REQUEST, places: 1 });

    await answer.accept(DRIVER, first.id);
    await expect(answer.accept(DRIVER, second.id)).rejects.toMatchObject({ reason: 'conflict' });
    expect((await trips.findById(1))?.placesLibres).toBe(0);
  });

  it('refusing keeps the reason for the passenger', async () => {
    const { request, answer, manage } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);

    await answer.refuse(DRIVER, booking.id, 'Je ne passe plus par là');

    await expect(manage.refusalReason(PASSENGER, booking.id)).resolves.toEqual({ motif: 'Je ne passe plus par là' });
  });

  it('a request ignored for 3 minutes expires and can no longer be accepted', async () => {
    const { request, answer, jobs, clock, notifier } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    clock.advanceSeconds(181);

    await expect(jobs.expireBookings()).resolves.toBe(1);
    await expect(answer.accept(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' });
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 9, type: 'demande_expiree' });
  });

  it('only the trip’s driver can answer', async () => {
    const { request, answer } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);

    await expect(answer.accept(makeUser({ id: 2 }), booking.id)).rejects.toMatchObject({ reason: 'not_found' });
  });
});

describe('AnswerBookingUseCase: real time', () => {
  it('the driver sees a new request at once, the passenger sees the answer at once', async () => {
    const { request, answer, realtime } = setupBookings();
    const booking = await request.create(PASSENGER, REQUEST);
    expect(realtime.eventsFor(1)).toContain('booking-requested');

    await answer.accept(DRIVER, booking.id);

    expect(realtime.eventsFor(9)).toContain('booking-updated');
  });
});
