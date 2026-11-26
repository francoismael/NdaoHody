import type { DemandeReservation } from '@contract';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { quoteReservation } from '../services/pricingService';

/**
 * The server's price for these seats and this pickup → drop, asked again whenever one of them changes.
 * The last price stays on screen while the new one comes (no flicker); the app never computes it.
 */
export const useReservationQuote = (demande: DemandeReservation | null) =>
  useQuery({
    // 'v2': the answer became a ResultatRecherche (block 7); an older answer kept in memory is never reused.
    queryKey: ['pricing', 'quote', 'v2', demande] as const,
    queryFn: demande ? () => quoteReservation(demande) : skipToken,
    placeholderData: keepPreviousData,
    retry: false,
  });
