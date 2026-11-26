import type { Chemin } from '@contract';
import { haversineMeters, isInMadagascar, thinPath } from '../../../src/domain/entity/geo';
import { ANALAKELY, ANDOHARANOFOTSY, PARIS } from '../../support/inMemoryGeo';

describe('geo', () => {
  it('measures Andoharanofotsy -> Analakely as the crow flies (about 8.7 km)', () => {
    expect(haversineMeters(ANDOHARANOFOTSY, ANALAKELY)).toBeGreaterThan(8500);
    expect(haversineMeters(ANDOHARANOFOTSY, ANALAKELY)).toBeLessThan(9000);
  });

  it('knows what is in Madagascar', () => {
    expect(isInMadagascar(ANALAKELY)).toBe(true);
    expect(isInMadagascar(PARIS)).toBe(false);
  });

  it('drops points closer than 20 m but keeps the first and the last', () => {
    const path: Chemin = [
      [47.5, -18.9],
      [47.50001, -18.9], // about 1 m further: dropped
      [47.501, -18.9], // about 105 m: kept
      [47.50101, -18.9], // last point: always kept
    ];

    expect(thinPath(path)).toEqual([
      [47.5, -18.9],
      [47.501, -18.9],
      [47.50101, -18.9],
    ]);
  });
});
