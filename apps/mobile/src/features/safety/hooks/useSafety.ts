import { useMutation } from '@tanstack/react-query';

import { createTrackingLink, sendSos, type SendSosInput } from '../services/safetyService';

export const useSendSos = () => useMutation({ mutationFn: (input: SendSosInput) => sendSos(input) });

export const useCreateTrackingLink = () => useMutation({ mutationFn: (reservationId: number) => createTrackingLink(reservationId) });
