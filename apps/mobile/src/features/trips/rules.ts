import type { StatutChauffeur, StatutTrajet, Vehicule } from '@contract';

/**
 * Publishing rules, shared by the screens and the simulated server.
 * Type-only imports: core may import this file.
 */

/** "My position" counts as a known place when one is this close (demo places). */
export const NEAREST_PLACE_MAX_METRES = 1500;

/** A trip can be planned this many days ahead at most (PWA: JOURS_MAX_A_L_AVANCE). */
export const PLAN_MAX_DAYS = 60;

/** Days offered as pills on the "when" step (PWA EtapeQuand: JOURS_AFFICHES). */
export const PLAN_DAYS_SHOWN = 14;

/** Planned time moves by this step, like the PWA clock (− / +). */
export const PLAN_STEP_MINUTES = 15;

/** Hours offered as shortcuts (PWA EtapeQuand: HEURES_PROPOSEES), in minutes after midnight. */
export const PLAN_SUGGESTED_MINUTES = [6 * 60, 7 * 60, 12 * 60, 17 * 60, 18 * 60] as const;

/** "Près d’Ivato", "Près de Tanjombato": the approximate name of a touched point. */
export function nearName(area: string): string {
  return /^[aeiouyhàâéèêëîïôûù]/i.test(area) ? `Près d’${area}` : `Près de ${area}`;
}

/**
 * A driver "passes near" a passenger when his path comes this close (a ~10 min walk
 * to the road). The ONE threshold of the matching, read by the simulated server for
 * the passenger home and the search (tomorrow: the API).
 */
export const PICKUP_MAX_WALK_METRES = 800;

/**
 * Search time window, measured on WHEN THE DRIVER PASSES THE PASSENGER'S POINT
 * (not when he leaves), on the demo clock. GAP #11 (to send to the backend):
 * not in data-objets.ts yet.
 * - "maintenant": he passes within the next SEARCH_NOW_MAX_MINUTES;
 * - "plus tard" at H: he passes between H − SEARCH_LATER_BEFORE_MINUTES and H + SEARCH_LATER_AFTER_MINUTES.
 */
export const SEARCH_NOW_MAX_MINUTES = 60;
export const SEARCH_LATER_BEFORE_MINUTES = 30;
export const SEARCH_LATER_AFTER_MINUTES = 120;

export const SEARCH_MESSAGES = {
  noDestination: 'Choisis ta destination.',
  samePlace: 'Ta destination est trop proche de ton départ.',
  pastTime: 'Choisis une heure à venir.',
} as const;

/** Shorter than this is not a carpool trip (same place twice, a few streets). */
export const MIN_TRIP_METRES = 500;

/** A trip still to come or on the road: shown on the driver's home. */
export const ACTIVE_TRIP_STATUSES: readonly StatutTrajet[] = ['publie', 'en_route', 'en_cours'];

export const PUBLISH_MESSAGES = {
  notValidated: 'Ton compte chauffeur n’est pas encore validé.',
  vehiclePending: 'Ton véhicule n’est pas encore validé.',
  pastDeparture: 'Choisis une heure de départ à venir.',
  tooFarAhead: `Tu peux publier un trajet au plus ${PLAN_MAX_DAYS} jours à l’avance.`,
  alreadyOnRoad: 'Tu as déjà un trajet en route. Termine-le avant d’en publier un autre immédiat.',
  noRoute: 'Aucun trajet enregistré entre ces deux lieux. Choisis une autre destination.',
  routeOffline: 'Pas de réseau pour calculer ce trajet. Réessaie, ou choisis deux lieux enregistrés.',
  searchOffline: 'Recherche indisponible sans réseau : voici les lieux enregistrés.',
  placeUnavailable: 'Impossible de récupérer ce lieu. Réessaie.',
  /** Name of a touched point when neither Mapbox nor the known places help. */
  unnamedPoint: 'Point choisi sur la carte',
  tooShort: 'Ce trajet est trop court. Choisis une destination plus éloignée du départ.',
  noPlaceNearby: 'Aucun point de départ connu près de toi. Choisis-en un dans la liste.',
  seatsInvalid: (max: number): string => `Entre 1 et ${max} place(s).`,
} as const;

/** Why a driver cannot publish, or null. Checked by the server AND shown by the screens. */
export type PublishBlocker = 'not_validated' | 'vehicle_pending';

export function publishBlocker(
  statutChauffeur: StatutChauffeur,
  vehicles: readonly Pick<Vehicule, 'parDefaut' | 'statut'>[],
): PublishBlocker | null {
  if (statutChauffeur !== 'valide') return 'not_validated';
  return vehicles.some((v) => v.parDefaut && v.statut === 'valide') ? null : 'vehicle_pending';
}

/** Problem with a planned departure, read on the DEMO clock (`nowMs`), or null. */
export function departureProblem(departureMs: number, nowMs: number): 'past' | 'too_far' | null {
  if (departureMs <= nowMs) return 'past';
  if (departureMs > nowMs + PLAN_MAX_DAYS * 24 * 60 * 60 * 1000) return 'too_far';
  return null;
}
