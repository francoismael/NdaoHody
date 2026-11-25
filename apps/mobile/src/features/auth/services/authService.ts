import type { Utilisateur } from '@contract';

import { DEMO_OTP_CODE, request } from '@/core/mock';

import type { OtpRequest, OtpVerification, SignUpName } from '../types';

export const requestOtp = (telephone: string) => request<OtpRequest>('POST', '/auth/otp', { telephone });

export const verifyOtp = (telephone: string, code: string) =>
  request<OtpVerification>('POST', '/auth/otp/verify', { telephone, code });

/** Sign-up, last step: saves the name of the new account (PATCH /me, signed with the pending user). */
export const completeSignUp = (name: SignUpName) => request<Utilisateur>('PATCH', '/me', name);

/** PROVISIONAL (simulated SMS): the code to type during the demo. Gone with the real SMS. */
export const DEMO_CODE_HINT = DEMO_OTP_CODE;
