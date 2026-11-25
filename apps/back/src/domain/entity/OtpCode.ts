/** An SMS sign-in code (table code_otp). Only the hash of the code is stored. */
export interface OtpCode {
  id: number;
  telephone: string;
  codeHash: string;
  /** Wrong codes typed so far. */
  essais: number;
  dateExpiration: Date;
  dateUtilisation: Date | null;
  dateCreation: Date;
}

export type NewOtpCode = Pick<OtpCode, 'telephone' | 'codeHash' | 'dateExpiration' | 'dateCreation'>;
