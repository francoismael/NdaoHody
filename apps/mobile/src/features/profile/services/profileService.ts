import type { Badge, ProfilPublic, Utilisateur } from '@contract';

import { request } from '@/core/mock';

export type UpdateMeInput = Partial<Pick<Utilisateur, 'prenom' | 'nom' | 'sexe'>>;

/** The badges the app shows ('top' is never shown, see GAP #2). */
export type DisplayBadge = Exclude<Badge, 'top'>;

export const getMe = () => request<Utilisateur>('GET', '/me');

export const updateMe = (input: UpdateMeInput) => request<Utilisateur>('PATCH', '/me', input);

export const getPublicProfile = (userId: number) => request<ProfilPublic>('GET', `/users/${userId}/public`);

/** GAP #2 (provisional decision): 'top' is not displayed; if the API sends it, show 'verifie'. */
export const toDisplayBadge = (badge: Badge): DisplayBadge => (badge === 'top' ? 'verifie' : badge);

/**
 * THE badge to show next to a name, or null. The server computes `badge`
 * (< 14 days = nouveau, then verifie / non_verifie from the driver status);
 * the app only hides "non vérifié" for someone who has never asked to drive.
 * Reused by the driver cards (blocks 4 to 6).
 */
export function visibleBadge(user: Pick<Utilisateur, 'badge' | 'statutChauffeur'>): DisplayBadge | null {
  const badge = toDisplayBadge(user.badge);
  return badge === 'non_verifie' && user.statutChauffeur === 'aucun' ? null : badge;
}
