/**
 * Malagasy mobile numbers. SAME RULE as the backend
 * (apps/back/src/domain/entity/PhoneNumber.ts): "3", the operator digit 2 to 9
 * (032 to 039, the Airtel 035 range included), then 7 digits.
 * Stored and sent as "+261XXXXXXXXX"; typed and shown as "034 12 345 67".
 */
const MALAGASY_MOBILE = /^3[2-9]\d{7}$/;
const COUNTRY_CODE = '261';
const SEPARATORS = /[\s.\-()]/g;

/** Digits of a national number: "0" + 9 digits. */
export const PHONE_NATIONAL_LENGTH = 10;

/** Shown in hints and error messages. */
export const PHONE_EXAMPLE = '034 12 345 67';

/** Groups of the national format: 034 12 345 67. */
const GROUPS = [3, 2, 3, 2];

function stripPrefix(digits: string): string {
  if (digits.startsWith(`+${COUNTRY_CODE}`)) return digits.slice(COUNTRY_CODE.length + 1);
  if (digits.startsWith(`00${COUNTRY_CODE}`)) return digits.slice(COUNTRY_CODE.length + 2);
  if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + 9) return digits.slice(COUNTRY_CODE.length);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * The only conversion to the stored format "+261XXXXXXXXX" (copy of the backend's).
 * Accepts "034 12 345 67", "0341234567", "341234567", "+261 34 12 345 67", "00261341234567".
 * Returns null when it is not a Malagasy mobile number.
 */
export function normalizePhoneNumber(input: string): string | null {
  const local = stripPrefix(input.replace(SEPARATORS, ''));
  return MALAGASY_MOBILE.test(local) ? `+${COUNTRY_CODE}${local}` : null;
}

/**
 * What is being typed or pasted, as national digits (at most 10):
 * "+261 34 12…" and "34 12…" both become "03412…".
 */
export function toNationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith(`00${COUNTRY_CODE}`)) digits = digits.slice(COUNTRY_CODE.length + 2);
  else if (digits.startsWith(COUNTRY_CODE) && digits.length > COUNTRY_CODE.length) digits = digits.slice(COUNTRY_CODE.length);
  if (digits.startsWith('3')) digits = `0${digits}`;
  return digits.slice(0, PHONE_NATIONAL_LENGTH);
}

/** National digits with spaces, as people write them: "0341234567" → "034 12 345 67". */
export function formatPhoneInput(nationalDigits: string): string {
  const parts: string[] = [];
  let start = 0;
  for (const size of GROUPS) {
    if (start >= nationalDigits.length) break;
    parts.push(nationalDigits.slice(start, start + size));
    start += size;
  }
  return parts.join(' ');
}

/** A stored number, for display: "+261341234567" → "034 12 345 67". */
export const formatPhoneNumber = (stored: string): string => formatPhoneInput(toNationalDigits(stored));

/** Why a typed number is refused, so the message can say what to fix. null = valid. */
export type PhoneProblem = 'empty' | 'operator' | 'incomplete';

export function phoneProblem(input: string): PhoneProblem | null {
  const digits = toNationalDigits(input);
  if (digits.length === 0) return 'empty';
  // Checked as soon as the first digits are there: "02…" or "031…" can never become valid.
  if ((digits.length >= 2 && digits[1] !== '3') || (digits.length >= 3 && !/[2-9]/.test(digits[2]))) return 'operator';
  if (digits.length < PHONE_NATIONAL_LENGTH) return 'incomplete';
  return normalizePhoneNumber(digits) === null ? 'operator' : null;
}
