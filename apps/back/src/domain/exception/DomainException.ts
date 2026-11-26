/** Why a business rule refused an action. The API turns each reason into an HTTP status. */
export type DomainErrorReason =
  | 'invalid' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409
  | 'too_many_requests' // 429
  | 'unavailable'; // 503: an outside service (maps, SMS...) does not answer

/**
 * Error raised by a business rule. The message is shown to the user as is (in French).
 */
export class DomainException extends Error {
  constructor(
    readonly reason: DomainErrorReason,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
