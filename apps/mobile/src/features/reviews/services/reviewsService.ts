import type { Avis } from '@contract';

import { request } from '@/core/mock';

export type CreateReviewInput = Pick<Avis, 'reservationId' | 'note' | 'commentaire'>;

export const createReview = (input: CreateReviewInput) => request<Avis>('POST', '/reviews', input);

export const getUserReviews = (userId: number) => request<Avis[]>('GET', `/users/${userId}/reviews`);
