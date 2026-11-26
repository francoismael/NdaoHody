import { Injectable } from '@nestjs/common';
import type { Position, StatutTrajet } from '@contract';
import { And, LessThan, MoreThanOrEqual } from 'typeorm';
import { ACTIVE_BOOKING_STATUSES } from '../../../../domain/entity/Booking';
import { BOOKABLE_STATUSES, ON_THE_ROAD_STATUSES, type NewTrip, type Trip, type TripChanges } from '../../../../domain/entity/Trip';
import { TripRepository, type CandidateCriteria, type TripMatch } from '../../../../domain/repository/TripRepository';
import { toTrip, toTripChanges, toTripRow, TripEntity } from '../entities/TripEntity';
import { TransactionContext } from '../TransactionContext';

/** Candidates examined per search (the best 20 are returned). */
const MAX_CANDIDATES = 50;

interface MatchRow {
  id: number;
  fb: number;
  fc: number;
  fd: number | null;
  b_lng: number;
  b_lat: number;
  c_lng: number;
  c_lat: number;
  distance: number;
}

@Injectable()
export class TypeOrmTripRepository extends TripRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async create(trip: NewTrip): Promise<Trip> {
    const repository = this.context.repository(TripEntity);
    return toTrip(await repository.save(repository.create(toTripRow(trip))));
  }

  async findById(id: number): Promise<Trip | null> {
    const entity = await this.context.repository(TripEntity).findOneBy({ id });
    return entity ? toTrip(entity) : null;
  }

  async listByDriver(chauffeurId: number): Promise<Trip[]> {
    const entities = await this.context.repository(TripEntity).find({ where: { chauffeurId }, order: { dateDepart: 'DESC' } });
    return entities.map(toTrip);
  }

  async findOnTheRoad(chauffeurId: number): Promise<Trip | null> {
    const rows: { id: number }[] = await this.context
      .manager()
      .query(`SELECT id FROM trajet WHERE chauffeur_id = $1 AND statut = ANY($2) LIMIT 1`, [chauffeurId, ON_THE_ROAD_STATUSES]);
    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  async hasOverlap(chauffeurId: number, from: Date, to: Date, excludeTripId: number | null): Promise<boolean> {
    const rows: { chevauche: boolean }[] = await this.context.manager().query(
      `SELECT EXISTS (
         SELECT 1 FROM trajet
         WHERE chauffeur_id = $1 AND statut = ANY($2) AND ($5::int IS NULL OR id <> $5)
           AND date_depart < $4 AND date_depart + duree_secondes * interval '1 second' > $3
       ) AS chevauche`,
      [chauffeurId, BOOKABLE_STATUSES, from, to, excludeTripId],
    );
    return rows[0]?.chevauche === true;
  }

  async update(id: number, changes: TripChanges): Promise<Trip> {
    const repository = this.context.repository(TripEntity);
    await repository.update({ id }, toTripChanges(changes));
    return toTrip(await repository.findOneByOrFail({ id }));
  }

  async takeSeats(id: number, places: number): Promise<boolean> {
    // One statement checked by the database: two acceptations on the last seat -> only one row updated.
    const result = await this.context
      .repository(TripEntity)
      .createQueryBuilder()
      .update(TripEntity)
      .set({ placesLibres: () => 'places_libres - :places' })
      .where('id = :id AND places_libres >= :places AND statut IN (:...statuts)', { id, places, statuts: BOOKABLE_STATUSES })
      .execute();
    return result.affected === 1;
  }

  async releaseSeats(id: number, places: number): Promise<void> {
    await this.context
      .repository(TripEntity)
      .createQueryBuilder()
      .update(TripEntity)
      .set({ placesLibres: () => 'LEAST(places_total, places_libres + :places)' })
      .where('id = :id', { id, places })
      .execute();
  }

  async listPublishedLeavingBetween(from: Date, to: Date): Promise<Trip[]> {
    const entities = await this.context.repository(TripEntity).find({
      where: { statut: 'publie', dateDepart: And(MoreThanOrEqual(from), LessThan(to)) },
    });
    return entities.map(toTrip);
  }

  async listWithStatus(statut: StatutTrajet, departureBefore: Date): Promise<Trip[]> {
    const entities = await this.context.repository(TripEntity).find({ where: { statut, dateDepart: LessThan(departureBefore) } });
    return entities.map(toTrip);
  }

  findCandidates(criteria: CandidateCriteria): Promise<TripMatch[]> {
    return this.locate(
      `t.statut = ANY($6) AND t.places_libres >= $7 AND t.chauffeur_id <> $8
       AND u.statut = 'actif'
       AND (NOT t.reserve_femmes OR $9) AND (NOT $10 OR t.reserve_femmes)
       AND NOT EXISTS (SELECT 1 FROM blocage bl WHERE (bl.utilisateur_id = $8 AND bl.bloque_id = t.chauffeur_id)
                                                    OR (bl.utilisateur_id = t.chauffeur_id AND bl.bloque_id = $8))
       AND NOT EXISTS (SELECT 1 FROM reservation r WHERE r.trajet_id = t.id AND r.passager_id = $8 AND r.statut = ANY($11))`,
      criteria.priseEnCharge,
      criteria.depose,
      criteria.margeMetres,
      [
        BOOKABLE_STATUSES,
        criteria.places,
        criteria.passagerId,
        criteria.passagerEstUneFemme,
        criteria.femmesSeulement,
        ACTIVE_BOOKING_STATUSES,
      ],
    );
  }

  async measure(tripId: number, priseEnCharge: Position, depose: Position, margeMetres: number): Promise<TripMatch | null> {
    const [match] = await this.locate('t.id = $6', priseEnCharge, depose, margeMetres, [tripId]);
    return match ?? null;
  }

  /**
   * Trips whose path passes within `margeMetres` of both points, pickup before drop-off ($1..$5 are the points
   * and the margin; `filter` uses $6 and the next ones). Fractions go from 0 (start of the path) to 1 (end).
   */
  private async locate(
    filter: string,
    b: Position,
    c: Position,
    margeMetres: number,
    filterParams: unknown[],
  ): Promise<TripMatch[]> {
    const rows: MatchRow[] = await this.context.manager().query(
      `WITH pts AS (
         SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS b,
                ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography AS c
       ), found AS (
         SELECT t.id,
                t.chemin_geo::geometry AS g,
                ST_LineLocatePoint(t.chemin_geo::geometry, pts.b::geometry) AS fb,
                ST_LineLocatePoint(t.chemin_geo::geometry, pts.c::geometry) AS fc,
                CASE WHEN pc.position_geo IS NULL THEN NULL
                     ELSE ST_LineLocatePoint(t.chemin_geo::geometry, pc.position_geo::geometry) END AS fd
         FROM trajet t
         CROSS JOIN pts
         JOIN utilisateur u ON u.id = t.chauffeur_id
         LEFT JOIN position_chauffeur pc ON pc.chauffeur_id = t.chauffeur_id AND pc.trajet_id = t.id AND pc.en_ligne
         WHERE ST_DWithin(t.chemin_geo, pts.b, $5) AND ST_DWithin(t.chemin_geo, pts.c, $5)
           AND ${filter}
       )
       SELECT id, fb, fc, fd,
              ST_X(ST_LineInterpolatePoint(g, fb)) AS b_lng, ST_Y(ST_LineInterpolatePoint(g, fb)) AS b_lat,
              ST_X(ST_LineInterpolatePoint(g, fc)) AS c_lng, ST_Y(ST_LineInterpolatePoint(g, fc)) AS c_lat,
              ST_Length(ST_LineSubstring(g, fb, fc)::geography) AS distance
       FROM found
       WHERE fb < fc
       ORDER BY id
       LIMIT ${MAX_CANDIDATES}`,
      [b.longitude, b.latitude, c.longitude, c.latitude, margeMetres, ...filterParams],
    );

    return rows.map((row) => ({
      tripId: Number(row.id),
      fractionPriseEnCharge: Number(row.fb),
      fractionDepose: Number(row.fc),
      fractionChauffeur: row.fd === null ? null : Number(row.fd),
      priseEnCharge: { latitude: Number(row.b_lat), longitude: Number(row.b_lng) },
      depose: { latitude: Number(row.c_lat), longitude: Number(row.c_lng) },
      distanceMetres: Math.max(1, Math.round(Number(row.distance))),
    }));
  }
}
