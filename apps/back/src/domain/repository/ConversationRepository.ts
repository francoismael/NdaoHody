/** Chat between a passenger and a driver (table conversation), opened when a request is accepted. */
export abstract class ConversationRepository {
  abstract openFor(reservationId: number): Promise<void>;
}
