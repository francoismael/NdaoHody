import { makeUser } from '../../support/inMemory';
import { matchIdentity, normalizeLicenseNumber, normalizePlateNumber } from '../../../src/domain/entity/DriverIdentity';

describe('normalizePlateNumber', () => {
  it.each(['1234 TBA', '1234tba', '1234-TBA', ' 1234  tba ', '1234.TBA'])('turns "%s" into "1234 TBA"', (input) => {
    expect(normalizePlateNumber(input)).toBe('1234 TBA');
  });

  it('keeps two-letter plates', () => {
    expect(normalizePlateNumber('5678 tb')).toBe('5678 TB');
  });

  it.each(['', 'TBA 1234', '123 TBA', '1234 T', '1234 TBAA'])('rejects "%s"', (input) => {
    expect(normalizePlateNumber(input)).toBeNull();
  });
});

describe('normalizeLicenseNumber', () => {
  it('removes spaces and punctuation and upper-cases', () => {
    expect(normalizeLicenseNumber(' ab-123 456 ')).toBe('AB123456');
  });

  it.each(['', '1234', 'A'.repeat(21)])('rejects "%s"', (input) => {
    expect(normalizeLicenseNumber(input)).toBeNull();
  });
});

describe('matchIdentity', () => {
  const current = makeUser({ id: 9 });

  it('lets the driver use a licence nobody has', () => {
    expect(matchIdentity(current, null)).toEqual({ kind: 'use' });
  });

  it('lets the driver use their own licence again', () => {
    expect(matchIdentity(current, current)).toEqual({ kind: 'use' });
  });

  it('recovers a deleted account with the same licence', () => {
    const previous = makeUser({ id: 3, statut: 'supprime' });
    expect(matchIdentity(current, previous)).toEqual({ kind: 'recover', previous });
  });

  it.each(['actif', 'suspendu'] as const)('refuses a licence of another %s account', (statut) => {
    expect(matchIdentity(current, makeUser({ id: 3, statut }))).toEqual({ kind: 'refuse' });
  });
});
