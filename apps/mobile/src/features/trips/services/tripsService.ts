import type { DemandeRecherche, PositionChauffeur, Position, ResultatRecherche, Trajet } from '@contract';

import { DEMO_POSITION, request } from '@/core/mock';

import type { Place, PublishTripInput, RoutePreview } from '../types';

export const searchTrips = (demande: DemandeRecherche) => request<ResultatRecherche[]>('POST', '/trips/search', demande);

export const getTrip = (trajetId: number) => request<Trajet>('GET', `/trips/${trajetId}`);

export const getMyTrips = () => request<Trajet[]>('GET', '/me/trips');

export const publishTrip = (input: PublishTripInput) => request<Trajet>('POST', '/trips', input);

export const getTripsAround = ({ latitude, longitude }: Position) =>
  request<Trajet[]>('GET', `/trips/around?latitude=${latitude}&longitude=${longitude}`);

/** Where the demo phone stands when GPS is off or not yet granted (Analakely). */
export const getDemoPosition = (): Position => DEMO_POSITION;

export const getNearbyDrivers = ({ latitude, longitude }: Position, rayonMetres = 3000) =>
  request<PositionChauffeur[]>('GET', `/drivers/nearby?latitude=${latitude}&longitude=${longitude}&rayonMetres=${rayonMetres}`);

/* Places and routing (GAP #8: not in the contract yet). */

export const getPlaces = () => request<Place[]>('GET', '/places');

/** The known place near `position`; 404 when none is close enough. */
export const getNearestPlace = ({ latitude, longitude }: Position) =>
  request<Place>('GET', `/places/nearest?latitude=${latitude}&longitude=${longitude}`);

export const getDestinations = (placeId: number) => request<Place[]>('GET', `/places/${placeId}/destinations`);

export const getRoutePreview = (departId: number, arriveeId: number) =>
  request<RoutePreview>('GET', `/routes?departId=${departId}&arriveeId=${arriveeId}`);
