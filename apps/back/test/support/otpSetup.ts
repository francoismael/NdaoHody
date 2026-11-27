import { OtpIssuerService } from '../../src/application/service/OtpIssuerService';
import { HandleWhatsAppStatusUseCase } from '../../src/application/usecases/auth/HandleWhatsAppStatusUseCase';
import { RequestOtpUseCase } from '../../src/application/usecases/auth/RequestOtpUseCase';
import {
  FixedClock,
  InMemoryOtpCodes,
  InMemorySettings,
  InMemoryUsers,
  PlainHasher,
  PredictableRandom,
  RecordingSms,
  RecordingWhatsApp,
} from './inMemory';

/** Sending sign-in codes (WhatsApp, SMS and the fallback), wired on in-memory fakes. */
export function setupOtp(users = new InMemoryUsers(), settings = new InMemorySettings()) {
  const otpCodes = new InMemoryOtpCodes();
  const sms = new RecordingSms();
  const whatsapp = new RecordingWhatsApp();
  const clock = new FixedClock();
  const issuer = new OtpIssuerService(otpCodes, settings, sms, whatsapp, new PlainHasher(), new PredictableRandom('048213'));
  return {
    request: new RequestOtpUseCase(otpCodes, users, issuer, clock),
    statuses: new HandleWhatsAppStatusUseCase(otpCodes, issuer, clock),
    otpCodes,
    sms,
    whatsapp,
    clock,
  };
}
