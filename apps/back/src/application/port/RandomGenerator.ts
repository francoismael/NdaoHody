/** Port: cryptographically secure random values. */
export abstract class RandomGenerator {
  /** 6 digits, e.g. "048213". */
  abstract otpCode(): string;

  /** Long random string used as a refresh token. */
  abstract token(): string;

  /** Temporary back-office password, given once to its owner. */
  abstract password(): string;
}
