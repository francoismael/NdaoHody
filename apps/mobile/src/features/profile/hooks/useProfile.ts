import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, getPublicProfile, updateMe, type UpdateMeInput } from '../services/profileService';

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  public: (userId: number) => [...profileKeys.all, 'public', userId] as const,
};

export const useMe = () => useQuery({ queryKey: profileKeys.me(), queryFn: getMe });

export const usePublicProfile = (userId: number) =>
  useQuery({ queryKey: profileKeys.public(userId), queryFn: () => getPublicProfile(userId) });

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    onSuccess: (me) => queryClient.setQueryData(profileKeys.me(), me),
  });
}
