import { normalizePhoneNumber } from '../../../src/domain/entity/PhoneNumber';

describe('normalizePhoneNumber', () => {
  it.each([
    '034 12 345 67',
    '0341234567',
    '341234567',
    '+261 34 12 345 67',
    '+261341234567',
    '261341234567',
    '00261341234567',
    '034.12.345.67',
    '034-12-345-67',
  ])('turns "%s" into +261341234567', (input) => {
    expect(normalizePhoneNumber(input)).toBe('+261341234567');
  });

  it.each(['', '12345', '0201234567', '03412345', '034123456789', '+33612345678', 'abc'])(
    'rejects "%s"',
    (input) => {
      expect(normalizePhoneNumber(input)).toBeNull();
    },
  );
});
