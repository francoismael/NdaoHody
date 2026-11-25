/**
 * Pure booking rules, shared by the screens and the simulated server.
 * No imports: core may import this file directly (never the domain's index.ts).
 */

/** Validated rule (contract: SuiviReservation.distanceMetres): under 500 m, "Je suis déjà sur place". */
export const ARRIVAL_RADIUS_METRES = 500;

export const isNearPickup = (distanceMetres: number): boolean => distanceMetres < ARRIVAL_RADIUS_METRES;
