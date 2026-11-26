import { isRecord } from '@/shared/utils';

import type { Lieu } from '@contract';

import type { ChosenPlace } from './types';

/**
 * The places chosen at step 1 travel to steps 2 and 3 as route params (text).
 * The road itself is not sent: steps 2 and 3 read it back from the query cache.
 */
export const encodePlace = (place: Lieu | ChosenPlace): string => JSON.stringify(place);

export function decodePlace(raw: string | string[] | undefined): ChosenPlace | null {
  if (typeof raw !== 'string') return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    const { libelle, latitude, longitude, placeId } = value;
    if (typeof libelle !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return { libelle, latitude, longitude, placeId: typeof placeId === 'number' ? placeId : null };
  } catch {
    return null;
  }
}
