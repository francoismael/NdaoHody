import type { Reservation } from '@contract';
import { useEffect } from 'react';

import { useSecondsLeft } from '@/shared/utils';

/** Once at 0:00, ask the server this often until it says "expiree" (the real API expires every 15 s). */
const TIME_UP_REFRESH_MS = 2000;

/**
 * The 3 minutes a request waits, seen by both sides (passenger's wait, driver's request).
 * Read from `dateExpiration` on the app clock, never counted by the screen: at 0:00 the
 * server decides, so we ask it again.
 */
export function useAnswerCountdown(reservation: Reservation | undefined, refetch: () => Promise<unknown>) {
  const waiting = reservation?.statut === 'en_attente';
  const left = useSecondsLeft(reservation && waiting ? new Date(reservation.dateExpiration).getTime() : null);
  const timeUp = waiting && left === 0;

  useEffect(() => {
    if (!timeUp) return undefined;
    void refetch();
    const timer = setInterval(() => void refetch(), TIME_UP_REFRESH_MS);
    return () => clearInterval(timer);
  }, [timeUp, refetch]);

  return { waiting, left, timeUp };
}
