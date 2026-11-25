import type { Lieu } from '@contract';

/**
 * Demo places in Antananarivo. Coordinates are approximate (± 200 m):
 * Mapbox Directions snaps each stop to the nearest road. Check them on the map.
 */
export const PLACES = {
  analakely: { libelle: 'Analakely, marché', latitude: -18.9067, longitude: 47.5245 },
  behoririka: { libelle: 'Behoririka, lac', latitude: -18.9005, longitude: 47.5275 },
  andravoahangy: { libelle: 'Andravoahangy, marché', latitude: -18.8955, longitude: 47.536 },
  ankorondrano: { libelle: 'Ankorondrano, rond-point', latitude: -18.8845, longitude: 47.5225 },
  andraharo: { libelle: 'Andraharo, Galaxy', latitude: -18.8885, longitude: 47.5085 },
  ivato: { libelle: 'Ivato, aéroport', latitude: -18.799, longitude: 47.4785 },
  anosy: { libelle: 'Anosy, lac', latitude: -18.9135, longitude: 47.5175 },
  ampefiloha: { libelle: 'Ampefiloha', latitude: -18.9105, longitude: 47.5115 },
  soixanteSeptHa: { libelle: '67 Ha, marché', latitude: -18.8995, longitude: 47.5105 },
  mahamasina: { libelle: 'Mahamasina, stade', latitude: -18.916, longitude: 47.523 },
  tanjombato: { libelle: 'Tanjombato, arrêt Jumbo', latitude: -18.9595, longitude: 47.5285 },
  itaosy: { libelle: 'Itaosy', latitude: -18.9235, longitude: 47.4745 },
  ambohipo: { libelle: 'Ambohipo', latitude: -18.9235, longitude: 47.556 },
  ankatso: { libelle: 'Ankatso, université', latitude: -18.9185, longitude: 47.558 },
} as const satisfies Record<string, Lieu>;

export type PlaceKey = keyof typeof PLACES;

/** Where the demo phone pretends to be when GPS is off (passenger at Analakely). */
export const DEMO_POSITION: Lieu = PLACES.analakely;
