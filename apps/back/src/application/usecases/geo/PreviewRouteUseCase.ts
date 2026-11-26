import { Injectable } from '@nestjs/common';
import type { Position } from '@contract';
import { haversineMeters, thinPath } from '../../../domain/entity/geo';
import { DomainException } from '../../../domain/exception/DomainException';
import type { RoutePreviewResponse } from '../../dto/GeoResponses';
import { assertInMadagascar } from '../../helper/geoRules';
import { RouteProvider } from '../../port/RouteProvider';

/** Below this, departure and arrival are the same place: no trip to compute. */
export const MIN_TRIP_METRES = 100;

/**
 * GET /geo/route: the road between two points, its distance and duration,
 * before the driver publishes (the trip itself stores the route computed again by the server, step 6).
 */
@Injectable()
export class PreviewRouteUseCase {
  constructor(private readonly routes: RouteProvider) {}

  async execute(depart: Position, arrivee: Position): Promise<RoutePreviewResponse> {
    assertInMadagascar(depart, arrivee);
    if (haversineMeters(depart, arrivee) < MIN_TRIP_METRES) {
      throw new DomainException('invalid', "Le départ et l'arrivée sont trop proches.");
    }

    const route = await this.routes.route([depart, arrivee]);
    const [departSurRoute, arriveeSurRoute] = route.pointsSurRoute;
    return {
      chemin: thinPath(route.chemin),
      distanceMetres: route.distanceMetres,
      dureeSecondes: route.dureeSecondes,
      departSurRoute: departSurRoute ?? depart,
      arriveeSurRoute: arriveeSurRoute ?? arrivee,
    };
  }
}
