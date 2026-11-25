import type { Badge, ProfilPublic, Utilisateur } from '@contract';

import { request } from '@/core/mock';

export type UpdateMeInput = Partial<Pick<Utilisateur, 'prenom' | 'nom' | 'sexe'>>;

export const getMe = () => request<Utilisateur>('GET', '/me');

export const updateMe = (input: UpdateMeInput) => request<Utilisateur>('PATCH', '/me', input);

export const getPublicProfile = (userId: number) => request<ProfilPublic>('GET', `/users/${userId}/public`);

/** GAP #2 (provisional decision): 'top' is not displayed; if the API sends it, show 'verifie'. */
export const toDisplayBadge = (badge: Badge): Exclude<Badge, 'top'> => (badge === 'top' ? 'verifie' : badge);
