import type { Lieu, Position, Trajet } from '@contract';

import { nearestPointIndex, pathLengthMeters, type LngLat } from '@/shared/map';

export const toLngLat = (point: Position): LngLat => [point.longitude, point.latitude];

export const toLieu = ([longitude, latitude]: LngLat, libelle: string): Lieu => ({ libelle, latitude, longitude });

export const nearestIndex = (trajet: Trajet, point: Position) => nearestPointIndex(trajet.chemin, toLngLat(point));

/** Road distance between two path indexes, scaled so the whole path equals `distanceMetres`. */
export function segmentMetres(trajet: Trajet, from: number, to: number): number {
  const total = pathLengthMeters(trajet.chemin);
  if (total === 0 || to <= from) return 0;
  return Math.round((pathLengthMeters(trajet.chemin, from, to) * trajet.distanceMetres) / total);
}

export function segmentSeconds(trajet: Trajet, from: number, to: number): number {
  if (trajet.distanceMetres === 0) return 0;
  return Math.round((segmentMetres(trajet, from, to) * trajet.dureeSecondes) / trajet.distanceMetres);
}
