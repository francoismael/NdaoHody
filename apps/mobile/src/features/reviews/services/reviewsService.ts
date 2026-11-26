import type { Avis } from '@contract';

import { request } from '@/core/mock';

import type { ReviewWithAuthor } from '../types';

export type CreateReviewInput = Pick<Avis, 'reservationId' | 'note' | 'commentaire'>;

export const createReview = (input: CreateReviewInput) => request<Avis>('POST', '/reviews', input);

export const getUserReviews = (userId: number) => request<ReviewWithAuthor[]>('GET', `/users/${userId}/reviews`);
