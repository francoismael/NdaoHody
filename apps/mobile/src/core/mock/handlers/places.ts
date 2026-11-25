import type { Quartier } from '@contract';

import { NEAREST_PLACE_MAX_METRES, PUBLISH_MESSAGES as M } from '@/features/trips/rules';
import type { RoutePreview } from '@/features/trips/types';

import { allPlaces, destinationsFrom, nearestPlace, placeKeyOf, routeBetween, toQuartier } from '../routeSlices';
import { HttpError, idParam, requireUser, type MockRoute, type RequestContext } from '../server';

/** GAP #8: places and routing are not in the contract yet (see features/trips/types.ts). */

function placeParam(ctx: RequestContext, name: string) {
  const value = Number(ctx.query[name] ?? ctx.params[name]);
  const key = Number.isInteger(value) ? placeKeyOf(value) : null;
  if (!key) throw new HttpError(404, 'Lieu introuvable.');
  return key;
}

export const placesRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/places',
    handler: (ctx): Quartier[] => {
      requireUser(ctx);
      return allPlaces();
    },
  },
  {
    method: 'GET',
    pattern: '/places/nearest',
    handler: (ctx): Quartier => {
      requireUser(ctx);
      const longitude = Number(ctx.query.longitude);
      const latitude = Number(ctx.query.latitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new HttpError(400, 'Position invalide.');
      const nearest = nearestPlace([longitude, latitude]);
      if (nearest.distanceMetres > NEAREST_PLACE_MAX_METRES) throw new HttpError(404, M.noPlaceNearby);
      return toQuartier(nearest.key);
    },
  },
  {
    method: 'GET',
    pattern: '/places/:id/destinations',
    handler: (ctx): Quartier[] => {
      requireUser(ctx);
      const key = placeKeyOf(idParam(ctx));
      if (!key) throw new HttpError(404, 'Lieu introuvable.');
      return destinationsFrom(key).map(toQuartier);
    },
  },
  {
    method: 'GET',
    pattern: '/routes',
    handler: (ctx): RoutePreview => {
      requireUser(ctx);
      const route = routeBetween(placeParam(ctx, 'departId'), placeParam(ctx, 'arriveeId'));
      if (!route) throw new HttpError(404, M.noRoute);
      return route;
    },
  },
];
