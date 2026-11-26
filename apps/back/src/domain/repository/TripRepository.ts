import type { Position, StatutTrajet } from '@contract';
import type { NewTrip, Trip, TripChanges } from '../entity/Trip';

/** Where the passenger's pickup and drop-off fall on a trip's path. */
export interface TripMatch {
  tripId: number;
  /** Position along the path, from 0 (start) to 1 (end). Pickup always before drop-off. */
  fractionPriseEnCharge: number;
  fractionDepose: number;
  /** Where the driver is along the path; null without a known position. */
  fractionChauffeur: number | null;
  /** The passenger's points moved onto the driver's path. */
  priseEnCharge: Position;
  depose: Position;
  /** Length of the driver's path between pickup and drop-off: what the passenger pays for. */
  distanceMetres: number;
}

export interface CandidateCriteria {
  priseEnCharge: Position;
  depose: Position;
  places: number;
  /** Margin between a passenger's point and the driver's path (GPS error). */
  margeMetres: number;
  passagerId: number;
  /** Women-only trips are visible to women only. */
  passagerEstUneFemme: boolean;
  /** A woman asked to see women-only trips only. */
  femmesSeulement: boolean;
}

export abstract class TripRepository {
  abstract create(trip: NewTrip): Promise<Trip>;

  abstract findById(id: number): Promise<Trip | null>;

  /** Trips of a driver, newest departure first. */
  abstract listByDriver(chauffeurId: number): Promise<Trip[]>;

  /** The driver's trip on the road (en_route or en_cours), if any. */
  abstract findOnTheRoad(chauffeurId: number): Promise<Trip | null>;

  /** true when another published or running trip of the driver overlaps [from, to]. */
  abstract hasOverlap(chauffeurId: number, from: Date, to: Date, excludeTripId: number | null): Promise<boolean>;

  abstract update(id: number, changes: TripChanges): Promise<Trip>;

  /** Takes seats in one statement: false when there are not enough left (never twice the same seat). */
  abstract takeSeats(id: number, places: number): Promise<boolean>;

  abstract releaseSeats(id: number, places: number): Promise<void>;

  /** Published trips (not started) leaving in [from, to[. */
  abstract listPublishedLeavingBetween(from: Date, to: Date): Promise<Trip[]>;

  abstract listWithStatus(statut: StatutTrajet, departureBefore: Date): Promise<Trip[]>;

  /** Bookable trips whose path passes by both points, pickup before drop-off (PostGIS). */
  abstract findCandidates(criteria: CandidateCriteria): Promise<TripMatch[]>;

  /** The same measure for one given trip; null when a point is off its path or in the wrong order. */
  abstract measure(tripId: number, priseEnCharge: Position, depose: Position, margeMetres: number): Promise<TripMatch | null>;
}
