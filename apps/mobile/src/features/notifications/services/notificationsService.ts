import type { Notification } from '@contract';

import { request } from '@/core/mock';

export const getMyNotifications = () => request<Notification[]>('GET', '/me/notifications');

export const markNotificationRead = (notificationId: string) =>
  request<Notification>('POST', `/notifications/${encodeURIComponent(notificationId)}/read`);

export const markAllNotificationsRead = () => request<{ lues: number }>('POST', '/me/notifications/read-all');
