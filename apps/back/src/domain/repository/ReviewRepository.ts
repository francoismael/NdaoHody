import type { Avis, AvisAvecAuteur } from '@contract';

export type NewReview = Omit<Avis, 'id'>;

/** Reviews (table avis): a passenger rates his driver once per finished ride. */
export abstract class ReviewRepository {
  abstract create(review: NewReview): Promise<Avis>;

  abstract findByBookingAndAuthor(reservationId: number, auteurId: number): Promise<Avis | null>;

  /** Reviews a user received, newest first, with their author's first name and photo. */
  abstract listReceivedBy(cibleId: number): Promise<AvisAvecAuteur[]>;
}
