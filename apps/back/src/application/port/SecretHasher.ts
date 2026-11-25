/**
 * Port: hashes short-lived secrets (SMS codes, refresh tokens) before they are stored.
 * The same value always gives the same hash, so a refresh token can be looked up by its hash.
 */
export abstract class SecretHasher {
  abstract hash(secret: string): string;

  /** Compares in constant time. */
  abstract matches(secret: string, hash: string): boolean;
}
