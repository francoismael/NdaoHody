/**
 * In-memory fakes for trips and bookings (unit tests, no database).
 */
import type { Avis, AvisAvecAuteur, Chemin, Position, PositionChauffeur, StatutReservation, StatutTrajet, Tarif, TypeVehicule } from '@contract';
import { RealtimeEvent, RealtimePublisher } from '../../src/application/port/RealtimePublisher';
import { NewNotification, UserNotifier } from '../../src/application/port/UserNotifier';
import type { Booking, BookingChanges, NewBooking } from '../../src/domain/entity/Booking';
import { ON_THE_ROAD_STATUSES, plannedArrival, type NewTrip, type Trip, type TripChanges } from '../../src/domain/entity/Trip';
import { BlockRepository } from '../../src/domain/repository/BlockRepository';
import { BookingRepository } from '../../src/domain/repository/BookingRepository';
import { ConversationRepository } from '../../src/domain/repository/ConversationRepository';
import { DriverPositionRepository } from '../../src/domain/repository/DriverPositionRepository';
import { ReportRepository } from '../../src/domain/repository/ReportRepository';
import { NewReview, ReviewRepository } from '../../src/domain/repository/ReviewRepository';
import { TariffRepository } from '../../src/domain/repository/TariffRepository';
import { TripRepository, type CandidateCriteria, type TripMatch } from '../../src/domain/repository/TripRepository';
import { InMemoryUsers, NOW } from './inMemory';

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    chauffeurId: 1,
    vehiculeId: 1,
    type: 'immediat',
    statut: 'en_route',
    depart: { libelle: 'Andoharanofotsy', latitude: -18.985, longitude: 47.533 },
    arrivee: { libelle: 'Analakely', latitude: -18.9067, longitude: 47.5253 },
    chemin: [
      [47.533, -18.985],
      [47.5253, -18.9067],
    ],
    distanceMetres: 9000,
    dureeSecondes: 1800,
    dateDepart: NOW.toISOString(),
    placesTotal: 4,
    placesLibres: 4,
    dateAnnulation: null,
    dateFin: null,
    reserveFemmes: false,
    ...overrides,
  };
}

export function makeMatch(overrides: Partial<TripMatch> = {}): TripMatch {
  return {
    tripId: 1,
    fractionPriseEnCharge: 0.3,
    fractionDepose: 0.9,
    fractionChauffeur: 0.1,
    priseEnCharge: { latitude: -18.96, longitude: 47.528 },
    depose: { latitude: -18.91, longitude: 47.525 },
    distanceMetres: 12_000,
    ...overrides,
  };
}

export class InMemoryTrips extends TripRepository {
  readonly rows: Trip[] = [];
  /** What findCandidates and measure answer (the PostGIS part is tested on a real database). */
  matches: TripMatch[] = [];

  constructor(...trips: Trip[]) {
    super();
    this.rows.push(...trips);
  }

  async create(trip: NewTrip): Promise<Trip> {
    const row: Trip = { ...trip, id: this.rows.length + 1, dateAnnulation: null, dateFin: null };
    this.rows.push(row);
    return row;
  }

  async findById(id: number): Promise<Trip | null> {
    return this.rows.find((trip) => trip.id === id) ?? null;
  }

  async listByDriver(chauffeurId: number): Promise<Trip[]> {
    return this.rows.filter((trip) => trip.chauffeurId === chauffeurId);
  }

  async findOnTheRoad(chauffeurId: number): Promise<Trip | null> {
    return this.rows.find((trip) => trip.chauffeurId === chauffeurId && ON_THE_ROAD_STATUSES.includes(trip.statut)) ?? null;
  }

  async hasOverlap(chauffeurId: number, from: Date, to: Date, excludeTripId: number | null): Promise<boolean> {
    return this.rows.some(
      (trip) =>
        trip.chauffeurId === chauffeurId &&
        trip.id !== excludeTripId &&
        ['publie', 'en_route', 'en_cours'].includes(trip.statut) &&
        new Date(trip.dateDepart) < to &&
        plannedArrival(trip) > from,
    );
  }

  async update(id: number, changes: TripChanges): Promise<Trip> {
    const trip = this.rows.find((row) => row.id === id) as Trip;
    Object.assign(trip, changes);
    return trip;
  }

  async takeSeats(id: number, places: number): Promise<boolean> {
    const trip = this.rows.find((row) => row.id === id);
    if (!trip || trip.placesLibres < places) {
      return false;
    }
    trip.placesLibres -= places;
    return true;
  }

  async releaseSeats(id: number, places: number): Promise<void> {
    const trip = this.rows.find((row) => row.id === id) as Trip;
    trip.placesLibres = Math.min(trip.placesTotal, trip.placesLibres + places);
  }

  async listPublishedLeavingBetween(from: Date, to: Date): Promise<Trip[]> {
    return this.rows.filter((trip) => trip.statut === 'publie' && new Date(trip.dateDepart) >= from && new Date(trip.dateDepart) < to);
  }

  async listWithStatus(statut: StatutTrajet, departureBefore: Date): Promise<Trip[]> {
    return this.rows.filter((trip) => trip.statut === statut && new Date(trip.dateDepart) < departureBefore);
  }

  lastCriteria: CandidateCriteria | null = null;

  async findCandidates(criteria: CandidateCriteria): Promise<TripMatch[]> {
    this.lastCriteria = criteria;
    return this.matches;
  }

  /** Straight line from `from` to `to`, 1 km; null when asked so (driver already past the pickup). */
  pathResult: { chemin: Chemin; distanceMetres: number } | null | undefined = undefined;

  async pathBetween(_tripId: number, from: Position, to: Position): Promise<{ chemin: Chemin; distanceMetres: number } | null> {
    if (this.pathResult !== undefined) {
      return this.pathResult;
    }
    return { chemin: [[from.longitude, from.latitude], [to.longitude, to.latitude]], distanceMetres: 1000 };
  }

  async measure(tripId: number): Promise<TripMatch | null> {
    return this.matches.find((match) => match.tripId === tripId) ?? null;
  }
}

export class InMemoryBookings extends BookingRepository {
  readonly rows: Booking[] = [];

  async create(booking: NewBooking): Promise<Booking> {
    const row: Booking = {
      ...booking,
      id: this.rows.length + 1,
      statut: 'en_attente',
      dateReponse: null,
      dateSurPlace: null,
      finAttente: null,
      prolongations: 0,
      dateDebutCourse: null,
      dateFinCourse: null,
      dateAnnulation: null,
      motifRefus: null,
    };
    this.rows.push(row);
    return row;
  }

  async findById(id: number): Promise<Booking | null> {
    return this.rows.find((booking) => booking.id === id) ?? null;
  }

  async listByPassenger(passagerId: number): Promise<Booking[]> {
    return this.rows.filter((booking) => booking.passagerId === passagerId);
  }

  async listWaitingForDriver(): Promise<Booking[]> {
    return this.rows.filter((booking) => booking.statut === 'en_attente');
  }

  async listOnTrip(trajetId: number, statuts: readonly StatutReservation[]): Promise<Booking[]> {
    return this.rows.filter((booking) => booking.trajetId === trajetId && statuts.includes(booking.statut));
  }

  async findActive(trajetId: number, passagerId: number): Promise<Booking | null> {
    return (
      this.rows.find(
        (booking) =>
          booking.trajetId === trajetId &&
          booking.passagerId === passagerId &&
          ['en_attente', 'acceptee', 'chauffeur_sur_place', 'en_course'].includes(booking.statut),
      ) ?? null
    );
  }

  async transition(id: number, from: readonly StatutReservation[], changes: BookingChanges): Promise<Booking | null> {
    const booking = this.rows.find((row) => row.id === id);
    if (!booking || !from.includes(booking.statut)) {
      return null;
    }
    Object.assign(booking, changes);
    return booking;
  }

  async expireDue(now: Date): Promise<Booking[]> {
    const due = this.rows.filter((booking) => booking.statut === 'en_attente' && new Date(booking.dateExpiration) <= now);
    due.forEach((booking) => (booking.statut = 'expiree'));
    return due;
  }

  async listWaitEndedBetween(from: Date, to: Date): Promise<Booking[]> {
    return this.rows.filter(
      (booking) => booking.statut === 'chauffeur_sur_place' && booking.finAttente !== null && new Date(booking.finAttente) >= from && new Date(booking.finAttente) < to,
    );
  }

  async listFinishedWithoutReviewBetween(from: Date, to: Date): Promise<Booking[]> {
    return this.rows.filter(
      (booking) => booking.statut === 'terminee' && booking.dateFinCourse !== null && new Date(booking.dateFinCourse) >= from && new Date(booking.dateFinCourse) < to,
    );
  }

  async countRetries(id: number): Promise<number> {
    let count = 0;
    let current = this.rows.find((row) => row.id === id);
    while (current?.relanceDe) {
      count += 1;
      const parent: number = current.relanceDe;
      current = this.rows.find((row) => row.id === parent);
    }
    return count;
  }
}

/** Car: 300 Ar/km, at least 3 000 Ar. Motorbike: 500 Ar/km, at least 5 000 Ar. */
export class FixedTariffs extends TariffRepository {
  async findByVehicleType(typeVehicule: TypeVehicule): Promise<Tarif> {
    return typeVehicule === 'moto'
      ? { typeVehicule, prixMinimum: 5000, prixParKm: 500, arrondi: 100 }
      : { typeVehicule, prixMinimum: 3000, prixParKm: 300, arrondi: 100 };
  }
}

export class RecordedPositions extends DriverPositionRepository {
  readonly saved: { chauffeurId: number; trajetId: number | null; position: Position; enLigne: boolean }[] = [];
  readonly rows = new Map<number, PositionChauffeur>();

  async save(chauffeurId: number, trajetId: number | null, position: Position, enLigne: boolean, at: Date): Promise<void> {
    this.saved.push({ chauffeurId, trajetId, position, enLigne });
    this.rows.set(chauffeurId, { chauffeurId, trajetId, ...position, enLigne, dateMiseAJour: at.toISOString() });
  }

  async findByDriver(chauffeurId: number): Promise<PositionChauffeur | null> {
    return this.rows.get(chauffeurId) ?? null;
  }

  async markStaleOffline(before: Date): Promise<number[]> {
    const stale = [...this.rows.values()].filter((row) => row.enLigne && new Date(row.dateMiseAJour) < before);
    stale.forEach((row) => (row.enLigne = false));
    return stale.map((row) => row.chauffeurId);
  }
}

/** Records what would be pushed over WebSocket. */
export class RecordingPublisher extends RealtimePublisher {
  readonly sent: { userId: number; event: RealtimeEvent; payload: object }[] = [];

  toUser(userId: number, event: RealtimeEvent, payload: object): void {
    this.sent.push({ userId, event, payload });
  }

  eventsFor(userId: number): RealtimeEvent[] {
    return this.sent.filter((sent) => sent.userId === userId).map((sent) => sent.event);
  }
}

export class FixedBlocks extends BlockRepository {
  constructor(private readonly blocked = false) {
    super();
  }

  async areBlocked(): Promise<boolean> {
    return this.blocked;
  }
}

export class RecordedConversations extends ConversationRepository {
  readonly opened: number[] = [];

  async openFor(reservationId: number): Promise<void> {
    this.opened.push(reservationId);
  }
}

export class RecordingNotifier extends UserNotifier {
  readonly sent: NewNotification[] = [];

  async notify(notification: NewNotification): Promise<void> {
    this.sent.push(notification);
  }
}

/** Reviews in memory; each rating is also given to the users fake so it can compute the average. */
export class InMemoryReviews extends ReviewRepository {
  readonly rows: Avis[] = [];

  constructor(private readonly users: InMemoryUsers) {
    super();
  }

  async create(review: NewReview): Promise<Avis> {
    const row: Avis = { ...review, id: this.rows.length + 1 };
    this.rows.push(row);
    this.users.ratings.set(review.cibleId, [...(this.users.ratings.get(review.cibleId) ?? []), review.note]);
    return row;
  }

  async findByBookingAndAuthor(reservationId: number, auteurId: number): Promise<Avis | null> {
    return this.rows.find((row) => row.reservationId === reservationId && row.auteurId === auteurId) ?? null;
  }

  async listReceivedBy(cibleId: number): Promise<AvisAvecAuteur[]> {
    return this.rows
      .filter((row) => row.cibleId === cibleId)
      .map((row) => ({ ...row, auteur: { prenom: 'Auteur', photoUrl: null } }));
  }
}

export class FixedReports extends ReportRepository {
  constructor(private readonly confirmed = 0) {
    super();
  }

  async countConfirmedAgainst(): Promise<number> {
    return this.confirmed;
  }
}
