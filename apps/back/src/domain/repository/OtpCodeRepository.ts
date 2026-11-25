import type { NewOtpCode, OtpCode } from '../entity/OtpCode';

export abstract class OtpCodeRepository {
  /** The most recent code sent to this number, used or not. */
  abstract findLatest(telephone: string): Promise<OtpCode | null>;

  abstract countCreatedSince(telephone: string, since: Date): Promise<number>;

  abstract create(code: NewOtpCode): Promise<OtpCode>;

  abstract recordFailedAttempt(id: number): Promise<void>;

  abstract markUsed(id: number, at: Date): Promise<void>;
}
