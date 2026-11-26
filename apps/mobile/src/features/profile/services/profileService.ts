import type { Badge, ProfilPublic, Utilisateur, Vehicule } from '@contract';

import { request } from '@/core/mock';

import type { DriverPublicProfile } from '../types';

export type UpdateMeInput = Partial<Pick<Utilisateur, 'prenom' | 'nom' | 'sexe'>>;

/** The badges the app shows ('top' is never shown, see GAP #2). */
export type DisplayBadge = Exclude<Badge, 'top'>;

export const getMe = () => request<Utilisateur>('GET', '/me');

export const updateMe = (input: UpdateMeInput) => request<Utilisateur>('PATCH', '/me', input);

export const getPublicProfile = (userId: number) => request<ProfilPublic>('GET', `/users/${userId}/public`);

export const getDriverProfile = (driverId: number) => request<DriverPublicProfile>('GET', `/drivers/${driverId}/public`);

/** "Toyota Corolla · Grise"; "Moto · Rouge" without brand nor model. Driver cards and public profile. */
export function vehicleText({ type, marque, modele, couleur }: Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur'>): string {
  const name = [marque, modele].filter(Boolean).join(' ') || (type === 'moto' ? 'Moto' : 'Voiture');
  return `${name} · ${couleur}`;
}

/** 4.8 -> "4,8": the average rating as the server rounds it (one decimal). */
export const formatRating = (note: number): string => note.toFixed(1).replace('.', ',');

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
