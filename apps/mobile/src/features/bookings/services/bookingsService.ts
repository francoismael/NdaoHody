import type { Reservation } from '@contract';

import { request } from '@/core/mock';

import type { CreateReservationInput } from '../types';

export const createReservation = (input: CreateReservationInput) => request<Reservation>('POST', '/reservations', input);

export const getMyReservations = () => request<Reservation[]>('GET', '/me/reservations');

export const getReservation = (reservationId: number) => request<Reservation>('GET', `/reservations/${reservationId}`);

export const cancelReservation = (reservationId: number) => request<Reservation>('POST', `/reservations/${reservationId}/cancel`);

export const retryReservation = (reservationId: number) => request<Reservation>('POST', `/reservations/${reservationId}/retry`);

/** Driver: requests waiting for an answer on his trips. */
export const getDriverRequests = () => request<Reservation[]>('GET', '/me/requests');

export const acceptReservation = (reservationId: number) => request<Reservation>('POST', `/reservations/${reservationId}/accept`);

export const refuseReservation = (reservationId: number, motif: string) =>
  request<Reservation>('POST', `/reservations/${reservationId}/refuse`, { motif });

/** GAP #3: the reason is not in `Reservation`; separate route until the backend decides. */
export const getRefusalReason = (reservationId: number) =>
  request<{ motif: string | null }>('GET', `/reservations/${reservationId}/refusal-reason`);
