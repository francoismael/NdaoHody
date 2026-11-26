import type { Avis, ProfilPublic } from '@contract';

/**
 * GET /users/:id/reviews: a review with who wrote it (first name and photo, never the phone).
 * GAP #14 (to send to the backend): the contract `Avis` only carries `auteurId`.
 */
export type ReviewWithAuthor = Avis & { auteur: Pick<ProfilPublic, 'prenom' | 'photoUrl'> };
