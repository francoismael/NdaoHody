import { useMutation } from '@tanstack/react-query';

import { requestOtp, verifyOtp } from '../services/authService';
import { setPendingUser, signIn } from '../services/sessionService';

export function useRequestOtp() {
  return useMutation({ mutationFn: (telephone: string) => requestOtp(telephone) });
}

/** Right code: known account -> signed in; new account -> stays in the flow for its name (R4). */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ telephone, code }: { telephone: string; code: string }) => verifyOtp(telephone, code),
    onSuccess: ({ utilisateur, nouveau }) => (nouveau ? setPendingUser(utilisateur.id) : signIn(utilisateur.id)),
  });
}
