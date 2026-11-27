import { Injectable } from '@nestjs/common';
import type { Avis, AvisAvecAuteur } from '@contract';
import { NewReview, ReviewRepository } from '../../../../domain/repository/ReviewRepository';
import { TransactionContext } from '../TransactionContext';

interface ReviewRow {
  id: string;
  reservation_id: string;
  auteur_id: string;
  cible_id: string;
  note: number;
  commentaire: string | null;
  date_avis: Date;
  auteur_prenom?: string | null;
  auteur_photo_url?: string | null;
}

function toAvis(row: ReviewRow): Avis {
  return {
    id: Number(row.id),
    reservationId: Number(row.reservation_id),
    auteurId: Number(row.auteur_id),
    cibleId: Number(row.cible_id),
    note: Number(row.note),
    commentaire: row.commentaire,
    dateAvis: new Date(row.date_avis).toISOString(),
  };
}

@Injectable()
export class TypeOrmReviewRepository extends ReviewRepository {
  constructor(private readonly context: TransactionContext) {
    super();
  }

  async create(review: NewReview): Promise<Avis> {
    const rows: ReviewRow[] = await this.context.manager().query(
      `INSERT INTO avis (reservation_id, auteur_id, cible_id, note, commentaire, date_avis)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reservation_id, auteur_id, cible_id, note, commentaire, date_avis`,
      [review.reservationId, review.auteurId, review.cibleId, review.note, review.commentaire, new Date(review.dateAvis)],
    );
    return toAvis(rows[0] as ReviewRow);
  }

  async findByBookingAndAuthor(reservationId: number, auteurId: number): Promise<Avis | null> {
    const rows: ReviewRow[] = await this.context.manager().query(
      `SELECT id, reservation_id, auteur_id, cible_id, note, commentaire, date_avis
       FROM avis WHERE reservation_id = $1 AND auteur_id = $2`,
      [reservationId, auteurId],
    );
    return rows[0] ? toAvis(rows[0]) : null;
  }

  async listReceivedBy(cibleId: number): Promise<AvisAvecAuteur[]> {
    const rows: ReviewRow[] = await this.context.manager().query(
      `SELECT a.id, a.reservation_id, a.auteur_id, a.cible_id, a.note, a.commentaire, a.date_avis,
              u.prenom AS auteur_prenom, u.photo_url AS auteur_photo_url
       FROM avis a JOIN utilisateur u ON u.id = a.auteur_id
       WHERE a.cible_id = $1
       ORDER BY a.date_avis DESC`,
      [cibleId],
    );
    return rows.map((row) => ({
      ...toAvis(row),
      auteur: { prenom: row.auteur_prenom ?? 'Utilisateur', photoUrl: row.auteur_photo_url ?? null },
    }));
  }
}
