import type { Chemin, Position } from '@contract';

/** GET /geo/area: name of the area at a point touched on the map. */
export interface AreaNameResponse {
  /** null when the map knows no area there: the app shows "Près de ..." itself. */
  libelle: string | null;
}

/** GET /geo/route: the road between two points, before publishing a trip. */
export interface RoutePreviewResponse {
  chemin: Chemin;
  distanceMetres: number;
  dureeSecondes: number;
  /** The departure and the arrival moved onto the nearest road. */
  departSurRoute: Position;
  arriveeSurRoute: Position;
}
