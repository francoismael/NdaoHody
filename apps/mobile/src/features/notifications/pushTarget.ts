import type { Role } from '@/features/auth';

import type { PushData } from './types';

/** Where a tapped notification leads, and in which role (the role guards need it first). */
export type PushTarget = {
  utilisateurId: number;
  role: Role;
  href: { pathname: '/request/[id]' | '/booking-wait/[id]'; params: { id: string } };
};

export function pushTarget(data: PushData): PushTarget | null {
  if (data.reservationId === undefined) return null;
  const params = { id: String(data.reservationId) };
  switch (data.type) {
    case 'nouvelle_demande':
    case 'reservation_annulee':
      return { utilisateurId: data.utilisateurId, role: 'chauffeur', href: { pathname: '/request/[id]', params } };
    case 'demande_acceptee':
    case 'demande_refusee':
    case 'demande_expiree':
      return { utilisateurId: data.utilisateurId, role: 'passager', href: { pathname: '/booking-wait/[id]', params } };
    default:
      return null;
  }
}
