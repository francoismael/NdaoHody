import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationsService';

export const notificationsKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationsKeys.all, 'list'] as const,
};

export const useMyNotifications = () => useQuery({ queryKey: notificationsKeys.list(), queryFn: getMyNotifications });

function useNotificationsMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }) });
}

export const useMarkNotificationRead = () => useNotificationsMutation((notificationId: string) => markNotificationRead(notificationId));

export const useMarkAllNotificationsRead = () => useNotificationsMutation(() => markAllNotificationsRead());
