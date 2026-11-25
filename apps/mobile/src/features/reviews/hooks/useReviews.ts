import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/features/profile';

import { createReview, getUserReviews, type CreateReviewInput } from '../services/reviewsService';

export const reviewsKeys = {
  all: ['reviews'] as const,
  ofUser: (userId: number) => [...reviewsKeys.all, userId] as const,
};

export const useUserReviews = (userId: number) =>
  useQuery({ queryKey: reviewsKeys.ofUser(userId), queryFn: () => getUserReviews(userId) });

/** A new review changes the driver's average rating: refresh profiles too. */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewsKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
