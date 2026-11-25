import { request } from '@/core/mock';

import type { OtpRequest, OtpVerification } from '../types';

export const requestOtp = (telephone: string) => request<OtpRequest>('POST', '/auth/otp', { telephone });

export const verifyOtp = (telephone: string, code: string) =>
  request<OtpVerification>('POST', '/auth/otp/verify', { telephone, code });
