import type { AlerteSos, LienSuivi } from '@contract';

import { request } from '@/core/mock';

export type SendSosInput = Partial<Pick<AlerteSos, 'reservationId' | 'latitude' | 'longitude'>>;

export const sendSos = (input: SendSosInput) => request<AlerteSos>('POST', '/sos', input);

/** Link for a relative, shared by WhatsApp / SMS (R29). */
export const createTrackingLink = (reservationId: number) =>
  request<LienSuivi>('POST', `/reservations/${reservationId}/tracking-link`);
