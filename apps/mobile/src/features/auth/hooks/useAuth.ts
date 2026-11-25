import { useMutation } from '@tanstack/react-query';

import { completeSignUp, requestOtp, verifyOtp } from '../services/authService';
import { setPendingUser, signIn } from '../services/sessionService';
import type { SignUpName } from '../types';

export { DEMO_CODE_HINT } from '../services/authService';

/** Sends the SMS. `telephone` is already normalized ("+261…"). */
export function useRequestOtp() {
  return useMutation({ mutationFn: (telephone: string) => requestOtp(telephone) });
}

/** Right code: known account -> signed in; new account -> stays in the flow for its name. */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ telephone, code }: { telephone: string; code: string }) => verifyOtp(telephone, code),
    onSuccess: ({ utilisateur, nouveau }) => (nouveau ? setPendingUser(utilisateur.id) : signIn(utilisateur.id)),
  });
}

/** Saves the name, then signs in: the guards leave the sign-in flow (its history included). */
export function useCompleteSignUp() {
  return useMutation({
    mutationFn: (name: SignUpName) => completeSignUp(name),
    onSuccess: (utilisateur) => signIn(utilisateur.id),
  });
}
