import type { Reservation } from '@contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { messagesKeys } from '@/features/messages';
import { notificationsKeys } from '@/features/notifications';
import { tripsKeys } from '@/features/trips';
import { LIVE_REFRESH_MS } from '@/shared/query';

import {
  acceptReservation,
  cancelReservation,
  createReservation,
  getDriverRequests,
  getMyReservations,
  getRefusalReason,
  getReservation,
  getTracking,
  refuseReservation,
  retryReservation,
} from '../services/bookingsService';
import type { CreateReservationInput } from '../types';

/** While a request waits for the driver, check often (3 min rule). */
const WAITING_REFRESH_MS = 3000;

export const bookingsKeys = {
  all: ['bookings'] as const,
  mine: () => [...bookingsKeys.all, 'mine'] as const,
  detail: (reservationId: number) => [...bookingsKeys.all, 'detail', reservationId] as const,
  requests: () => [...bookingsKeys.all, 'requests'] as const,
  refusal: (reservationId: number) => [...bookingsKeys.all, 'refusal', reservationId] as const,
  tracking: (reservationId: number) => [...bookingsKeys.all, 'tracking', reservationId] as const,
};

export const useMyReservations = () => useQuery({ queryKey: bookingsKeys.mine(), queryFn: getMyReservations });

export const useReservation = (reservationId: number) =>
  useQuery({
    queryKey: bookingsKeys.detail(reservationId),
    queryFn: () => getReservation(reservationId),
    refetchInterval: (query) => (query.state.data?.statut === 'en_attente' ? WAITING_REFRESH_MS : false),
  });

export const useDriverRequests = () =>
  useQuery({ queryKey: bookingsKeys.requests(), queryFn: getDriverRequests, refetchInterval: WAITING_REFRESH_MS });

export const useRefusalReason = (reservationId: number, enabled: boolean) =>
  useQuery({ queryKey: bookingsKeys.refusal(reservationId), queryFn: () => getRefusalReason(reservationId), enabled });

/**
 * The live approach: the server says where the car is, its road to the pickup point and the minutes left.
 * Asked again at the rhythm of the positions; stops when the server says there is nothing to follow (409).
 */
export const useReservationTracking = (reservationId: number) =>
  useQuery({
    queryKey: bookingsKeys.tracking(reservationId),
    queryFn: () => getTracking(reservationId),
    refetchInterval: (query) => (query.state.error ? false : LIVE_REFRESH_MS),
    retry: false,
  });

/** Any booking change moves seats, so trips, notifications and messages are refreshed too. */
function useBookingMutation<TInput>(mutationFn: (input: TInput) => Promise<Reservation>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (reservation) => {
      queryClient.setQueryData(bookingsKeys.detail(reservation.id), reservation);
      void queryClient.invalidateQueries({ queryKey: bookingsKeys.all });
      void queryClient.invalidateQueries({ queryKey: tripsKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      void queryClient.invalidateQueries({ queryKey: messagesKeys.all });
    },
  });
}

export const useCreateReservation = () => useBookingMutation((input: CreateReservationInput) => createReservation(input));
export const useCancelReservation = () => useBookingMutation((reservationId: number) => cancelReservation(reservationId));
export const useRetryReservation = () => useBookingMutation((reservationId: number) => retryReservation(reservationId));
export const useAcceptReservation = () => useBookingMutation((reservationId: number) => acceptReservation(reservationId));
export const useRefuseReservation = () =>
  useBookingMutation(({ reservationId, motif }: { reservationId: number; motif: string }) => refuseReservation(reservationId, motif));
