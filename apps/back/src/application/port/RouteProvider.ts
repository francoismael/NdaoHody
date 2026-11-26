import type { Chemin, Position } from '@contract';

export interface DrivingRoute {
  /** Road path, [longitude, latitude] points (GeoJSON order). */
  chemin: Chemin;
  distanceMetres: number;
  dureeSecondes: number;
  /**
   * Each stop moved onto the nearest road, in the same order as asked.
   * A point picked on a building or a field becomes the point of the street where the car stops.
   */
  pointsSurRoute: Position[];
}

/**
 * Port: shortest driving route through 2 or more stops (Mapbox Directions today).
 * Throws a DomainException: 'invalid' when no road joins the stops, 'unavailable' when the service does not answer.
 */
export abstract class RouteProvider {
  abstract route(stops: readonly Position[]): Promise<DrivingRoute>;
}
