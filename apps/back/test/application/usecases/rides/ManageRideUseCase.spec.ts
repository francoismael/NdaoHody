import { DRIVER, PASSENGER, REQUEST, setupBookings, tripOne } from '../../../support/bookingSetup';

/** About 100 m from the pickup point (Tanjombato, -18.96 / 47.528). */
const NEAR_PICKUP = { latitude: -18.9609, longitude: 47.528 };
/** About 2 km before it. */
const FAR_FROM_PICKUP = { latitude: -18.978, longitude: 47.532 };

async function accepted() {
  const rides = setupBookings();
  const booking = await rides.request.create(PASSENGER, REQUEST);
  await rides.answer.accept(DRIVER, booking.id);
  return { ...rides, booking };
}

describe('ManageRideUseCase — arrival', () => {
  it('"Je suis sur place" within 500 m: the passenger has 10 minutes', async () => {
    const { ride, positions, clock, booking, notifier } = await accepted();
    await positions.save(1, 1, NEAR_PICKUP, true, clock.now());

    const onSite = await ride.onSite(DRIVER, booking.id);

    expect(onSite.statut).toBe('chauffeur_sur_place');
    expect(onSite.finAttente).toBe(new Date(clock.now().getTime() + 10 * 60_000).toISOString());
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 9, type: 'chauffeur_sur_place' });
  });

  it('refuses "sur place" further than 500 m, or without a recent position', async () => {
    const { ride, positions, clock, booking } = await accepted();

    await expect(ride.onSite(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' }); // no position
    await positions.save(1, 1, FAR_FROM_PICKUP, true, clock.now());
    await expect(ride.onSite(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' });
    await positions.save(1, 1, NEAR_PICKUP, true, clock.now());
    clock.advanceSeconds(3 * 60);
    await expect(ride.onSite(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' }); // position too old
  });

  it('after the 10 minutes: wait 10 more minutes, or mark the passenger absent', async () => {
    const { ride, positions, clock, booking, trips, users } = await accepted();
    await positions.save(1, 1, NEAR_PICKUP, true, clock.now());
    await ride.onSite(DRIVER, booking.id);

    await expect(ride.extendWait(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' }); // too early
    clock.advanceSeconds(10 * 60);
    await expect(ride.extendWait(DRIVER, booking.id)).resolves.toMatchObject({ prolongations: 1 });

    clock.advanceSeconds(10 * 60);
    await expect(ride.noShow(DRIVER, booking.id)).resolves.toMatchObject({ statut: 'absent' });
    expect((await tripOne(trips)).placesLibres).toBe(4); // seats back
    expect((await users.findById(9))?.absences).toBe(1);
  });
});

describe('ManageRideUseCase — the ride', () => {
  it('start puts the passenger on board and the trip "en_cours"; finish ends his ride and counts it', async () => {
    const { ride, booking, trips, users, notifier } = await accepted();

    await expect(ride.start(DRIVER, booking.id)).resolves.toMatchObject({ statut: 'en_course' });
    expect((await tripOne(trips)).statut).toBe('en_cours');

    await expect(ride.finish(DRIVER, booking.id)).resolves.toMatchObject({ statut: 'terminee' });
    expect((await tripOne(trips)).statut).toBe('en_route'); // nobody on board, still on the road
    expect((await users.findById(9))?.coursesPassager).toBe(1);
    expect((await users.findById(1))?.coursesChauffeur).toBe(1);
    expect(notifier.sent.at(-1)).toMatchObject({ utilisateurId: 9, type: 'course_terminee_noter' });
  });

  it('only the trip’s driver acts, in the right order', async () => {
    const { ride, booking } = await accepted();

    await expect(ride.finish(DRIVER, booking.id)).rejects.toMatchObject({ reason: 'conflict' }); // not started
    await expect(ride.start(PASSENGER, booking.id)).rejects.toMatchObject({ reason: 'not_found' });
  });
});
