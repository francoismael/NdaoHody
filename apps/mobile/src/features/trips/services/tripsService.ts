import type { DemandeRecherche, PositionChauffeur, Position, ResultatRecherche, Trajet } from '@contract';

import { DEMO_POSITION, request } from '@/core/mock';

import type { PublishTripInput } from '../types';

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
