/** Malagasy mobile number without the country code: 3 + operator digit + 7 digits (e.g. 341234567). */
const MALAGASY_MOBILE = /^3[2-9]\d{7}$/;
const COUNTRY_CODE = '261';
const SEPARATORS = /[\s.\-()]/g;

/**
 * Turns what the user typed into the stored format "+261XXXXXXXXX".
 * Accepts "034 12 345 67", "0341234567", "341234567", "+261 34 12 345 67", "00261341234567".
 * Returns null when it is not a Malagasy mobile number.
 */
export function normalizePhoneNumber(input: string): string | null {
  const digits = input.replace(SEPARATORS, '');
  const local = stripPrefix(digits);
  return MALAGASY_MOBILE.test(local) ? `+${COUNTRY_CODE}${local}` : null;
}

function stripPrefix(digits: string): string {
  if (digits.startsWith(`+${COUNTRY_CODE}`)) {
    return digits.slice(COUNTRY_CODE.length + 1);
  }
  if (digits.startsWith(`00${COUNTRY_CODE}`)) {
    return digits.slice(COUNTRY_CODE.length + 2);
  }
  if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + 9) {
    return digits.slice(COUNTRY_CODE.length);
  }
  if (digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}
