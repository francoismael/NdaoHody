import type { PlaceKey } from './places';

/** Pre-recorded itineraries: ordered stops. The road path comes from Mapbox once, then is saved. */
export const ITINERARIES = {
  tanjombatoIvato: ['tanjombato', 'mahamasina', 'analakely', 'behoririka', 'ankorondrano', 'ivato'],
  ivatoTanjombato: ['ivato', 'andraharo', 'analakely', 'anosy', 'tanjombato'],
  ampefilohaAndravoahangy: ['ampefiloha', 'anosy', 'analakely', 'behoririka', 'andravoahangy'],
  itaosyAnkatso: ['itaosy', 'soixanteSeptHa', 'analakely', 'ambohipo', 'ankatso'],
} as const satisfies Record<string, readonly PlaceKey[]>;

export type ItineraryKey = keyof typeof ITINERARIES;

export const ITINERARY_KEYS = Object.keys(ITINERARIES) as ItineraryKey[];
