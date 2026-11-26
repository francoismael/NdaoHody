import { EtaService } from '../../../src/application/service/EtaService';
import { FixedClock } from '../../support/inMemory';
import { ANALAKELY, ANDOHARANOFOTSY, StraightLineRoutes } from '../../support/inMemoryGeo';

/** About 55 m north of Andoharanofotsy. */
const A_BIT_FURTHER = { latitude: ANDOHARANOFOTSY.latitude + 0.0005, longitude: ANDOHARANOFOTSY.longitude };
/** About 220 m north. */
const FAR_ENOUGH = { latitude: ANDOHARANOFOTSY.latitude + 0.002, longitude: ANDOHARANOFOTSY.longitude };

function setup() {
  const routes = new StraightLineRoutes();
  const clock = new FixedClock();
  return { eta: new EtaService(routes, clock), routes, clock };
}

describe('EtaService', () => {
  it('turns the road duration into whole minutes, at least 1', async () => {
    const { eta } = setup();

    await expect(eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY)).resolves.toBe(2); // 100 s -> 2 min
  });

  it('reuses the answer for 30 s, wherever the driver is', async () => {
    const { eta, routes, clock } = setup();
    await eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY);
    clock.advanceSeconds(20);

    await eta.minutesUntil(1, FAR_ENOUGH, ANALAKELY);

    expect(routes.calls).toBe(1);
  });

  it('after 30 s, asks again only if the driver moved 100 m or more', async () => {
    const { eta, routes, clock } = setup();
    await eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY);
    clock.advanceSeconds(40);

    await eta.minutesUntil(1, A_BIT_FURTHER, ANALAKELY);
    expect(routes.calls).toBe(1);

    await eta.minutesUntil(1, FAR_ENOUGH, ANALAKELY);
    expect(routes.calls).toBe(2);
  });

  it('asks again after 5 minutes even if the driver did not move', async () => {
    const { eta, routes, clock } = setup();
    await eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY);
    clock.advanceSeconds(5 * 60);

    await eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY);

    expect(routes.calls).toBe(2);
  });

  it('keeps one answer per driver and per target', async () => {
    const { eta, routes } = setup();
    await eta.minutesUntil(1, ANDOHARANOFOTSY, ANALAKELY);

    await eta.minutesUntil(2, ANDOHARANOFOTSY, ANALAKELY);

    expect(routes.calls).toBe(2);
  });
});
