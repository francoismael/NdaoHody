import type { DemandeReservation } from '@contract';
import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { LIVE_REFRESH_MS } from '@/shared/query';

import { quoteReservation } from '../services/pricingService';

/**
 * The server's price for these seats and this pickup → drop, asked again whenever one of them changes.
 * The last price stays on screen while the new one comes (no flicker); the app never computes it.
 * Also the driver's live position (positionChauffeur), hence the refresh every 5 s.
 */
export const useReservationQuote = (demande: DemandeReservation | null) =>
  useQuery({
    // 'v2': the answer became a ResultatRecherche (block 7); an older answer kept in memory is never reused.
    queryKey: ['pricing', 'quote', 'v2', demande] as const,
    queryFn: demande ? () => quoteReservation(demande) : skipToken,
    placeholderData: keepPreviousData,
    // Asked again like the home: the driver's car moves on the map while the passenger chooses.
    refetchInterval: LIVE_REFRESH_MS,
    retry: false,
  });
