import type { User } from './User';

const LICENSE_NUMBER = /^[A-Z0-9]{5,20}$/;
/** Malagasy plate: 4 digits then 2 or 3 letters, e.g. "1234 TBA". */
const PLATE_NUMBER = /^(\d{4})([A-Z]{2,3})$/;
const NOT_ALPHANUMERIC = /[^A-Z0-9]/g;

/** "ab-123 456" -> "AB123456". null when it cannot be a licence number. */
export function normalizeLicenseNumber(input: string): string | null {
  const value = input.toUpperCase().replace(NOT_ALPHANUMERIC, '');
  return LICENSE_NUMBER.test(value) ? value : null;
}

/** "1234tba", "1234-TBA" -> "1234 TBA". null when it is not a Malagasy plate. */
export function normalizePlateNumber(input: string): string | null {
  const match = PLATE_NUMBER.exec(input.toUpperCase().replace(NOT_ALPHANUMERIC, ''));
  return match ? `${match[1]} ${match[2]}` : null;
}

/**
 * What to do when a driver gives a licence or a plate already known by the back.
 * - use: nobody else has it (or it is already theirs), go on;
 * - recover: it belongs to a DELETED account, which is the same person coming back:
 *   that old account is reactivated, with its history and what it still owes;
 * - refuse: it belongs to another account still in use (active or suspended).
 */
export type IdentityMatch = { kind: 'use' } | { kind: 'recover'; previous: User } | { kind: 'refuse' };

export function matchIdentity(current: Pick<User, 'id'>, owner: User | null): IdentityMatch {
  if (!owner || owner.id === current.id) {
    return { kind: 'use' };
  }
  return owner.statut === 'supprime' ? { kind: 'recover', previous: owner } : { kind: 'refuse' };
}
