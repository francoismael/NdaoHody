import { Injectable, Logger } from '@nestjs/common';
import type { Reservation, StatutReservation, TypeNotification } from '@contract';
import type { Booking } from '../../../domain/entity/Booking';
import { haversineMeters } from '../../../domain/entity/geo';
import type { Trip } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { notifyBestEffort } from '../../helper/bestEffort';
import { addMs, MINUTE_MS } from '../../helper/durations';
import { toReservation } from '../../helper/rideViews';
import { ON_SITE_RADIUS_METRES, readSetting, WAIT_MINUTES } from '../../helper/settings';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';
import { UnitOfWork } from '../../port/UnitOfWork';
import { UserNotifier } from '../../port/UserNotifier';
import { BadgeService } from '../../service/BadgeService';

/** A driver's position older than this cannot prove he is on site. */
const POSITION_MAX_AGE_MINUTES = 2;

/**
 * The driver, from his arrival to the end of each passenger's ride:
 * POST /reservations/:id/on-site, /extend-wait, /no-show, /start, /finish.
 */
@Injectable()
export class ManageRideUseCase {
  private readonly logger = new Logger(ManageRideUseCase.name);

  constructor(
    private readonly bookings: BookingRepository,
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
    private readonly positions: DriverPositionRepository,
    private readonly settings: SettingRepository,
    private readonly badges: BadgeService,
    private readonly notifier: UserNotifier,
    private readonly realtime: RealtimePublisher,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  /** "Je suis sur place": the server checks the driver is within 500 m; the passenger has 10 min to come (setting attente_minutes). */
  async onSite(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForDriver(driver, bookingId, ['acceptee']);
    const now = this.clock.now();
    const radius = await readSetting(this.settings, ON_SITE_RADIUS_METRES);
    const position = await this.positions.findByDriver(driver.id);
    const fresh = position && now.getTime() - new Date(position.dateMiseAJour).getTime() <= POSITION_MAX_AGE_MINUTES * MINUTE_MS;
    if (!position || !fresh) {
      throw new DomainException('conflict', 'Active ta localisation : ta position est nécessaire pour signaler ton arrivée.');
    }
    const distance = Math.round(haversineMeters(position, booking.priseEnCharge));
    if (distance > radius) {
      throw new DomainException('conflict', `Tu es encore à ${distance} m du point de prise en charge (${radius} m au plus).`);
    }

    const waitMinutes = await readSetting(this.settings, WAIT_MINUTES);
    const updated = await this.move(booking, ['acceptee'], {
      statut: 'chauffeur_sur_place',
      dateSurPlace: now.toISOString(),
      finAttente: addMs(now, waitMinutes * MINUTE_MS).toISOString(),
    });
    await this.tell(updated, booking.passagerId, 'chauffeur_sur_place', 'Ton chauffeur est arrivé', `Il t'attend ${waitMinutes} min au point de prise en charge.`, trip);
    return toReservation(updated);
  }

  /** After the wait, the driver chooses to wait as long again... */
  async extendWait(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForDriver(driver, bookingId, ['chauffeur_sur_place']);
    this.assertWaitEnded(booking);
    const waitMinutes = await readSetting(this.settings, WAIT_MINUTES);
    const updated = await this.move(booking, ['chauffeur_sur_place'], {
      finAttente: addMs(this.clock.now(), waitMinutes * MINUTE_MS).toISOString(),
      prolongations: booking.prolongations + 1,
    });
    await this.tell(updated, booking.passagerId, 'attente_prolongee', 'Ton chauffeur attend encore', `Il t'attend encore ${waitMinutes} min.`, trip);
    return toReservation(updated);
  }

  /** ...or marks the passenger absent: the seats go back to the trip and the absence is counted. */
  async noShow(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForDriver(driver, bookingId, ['chauffeur_sur_place']);
    this.assertWaitEnded(booking);

    const updated = await this.unitOfWork.run(async () => {
      const changed = await this.move(booking, ['chauffeur_sur_place'], { statut: 'absent' });
      await this.trips.releaseSeats(trip.id, booking.places);
      await this.users.countAbsence(booking.passagerId);
      return changed;
    });
    await this.badges.refresh(booking.passagerId);
    await this.tell(updated, booking.passagerId, 'attente_terminee', 'Marqué absent', "Le chauffeur t'a attendu puis est reparti. Ta réservation est annulée.", trip);
    return toReservation(updated);
  }

  /** The passenger is on board: his ride starts, the trip is "en_cours". */
  async start(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForDriver(driver, bookingId, ['acceptee', 'chauffeur_sur_place']);
    const updated = await this.unitOfWork.run(async () => {
      const changed = await this.move(booking, ['acceptee', 'chauffeur_sur_place'], {
        statut: 'en_course',
        dateDebutCourse: this.clock.now().toISOString(),
      });
      if (trip.statut !== 'en_cours') {
        await this.trips.update(trip.id, { statut: 'en_cours' });
      }
      return changed;
    });
    await this.tell(updated, booking.passagerId, 'course_demarree', 'Course démarrée', 'Bon trajet !', trip);
    return toReservation(updated);
  }

  /** This passenger's ride ends (the others go on). He is asked to rate his driver. */
  async finish(driver: User, bookingId: number): Promise<Reservation> {
    const { booking, trip } = await this.findForDriver(driver, bookingId, ['en_course']);
    const updated = await this.unitOfWork.run(async () => {
      const changed = await this.move(booking, ['en_course'], { statut: 'terminee', dateFinCourse: this.clock.now().toISOString() });
      await this.users.countRide(booking.passagerId, 'passager');
      await this.users.countRide(driver.id, 'chauffeur');
      // Nobody on board any more: the driver is still on the road and can take other passengers.
      if ((await this.bookings.listOnTrip(trip.id, ['en_course'])).length === 0) {
        await this.trips.update(trip.id, { statut: 'en_route' });
      }
      return changed;
    });
    await Promise.all([this.badges.refresh(booking.passagerId), this.badges.refresh(driver.id)]);
    await this.tell(updated, booking.passagerId, 'course_terminee_noter', 'Course terminée', 'Ta course est terminée : note ton chauffeur.', trip);
    return toReservation(updated);
  }

  private assertWaitEnded(booking: Booking): void {
    if (!booking.finAttente || new Date(booking.finAttente) > this.clock.now()) {
      throw new DomainException('conflict', 'Le compte à rebours n’est pas terminé : attends la fin avant de choisir.');
    }
  }

  private async move(booking: Booking, from: readonly StatutReservation[], changes: Parameters<BookingRepository['transition']>[2]): Promise<Booking> {
    const changed = await this.bookings.transition(booking.id, from, changes);
    if (!changed) {
      throw new DomainException('conflict', 'Cette réservation vient de changer. Recharge la page.');
    }
    return changed;
  }

  private async tell(booking: Booking, userId: number, type: TypeNotification, titre: string, message: string, trip: Trip): Promise<void> {
    this.realtime.toUser(userId, 'booking-updated', toReservation(booking));
    this.realtime.toUser(trip.chauffeurId, 'booking-updated', toReservation(booking));
    await notifyBestEffort(this.logger, this.notifier, {
      utilisateurId: userId,
      type,
      titre,
      message,
      donnees: { reservationId: booking.id, trajetId: trip.id },
    });
  }

  /** Only the trip's driver acts, and only on a booking in the expected status. */
  private async findForDriver(
    driver: User,
    bookingId: number,
    expected: readonly StatutReservation[],
  ): Promise<{ booking: Booking; trip: Trip }> {
    const booking = await this.bookings.findById(bookingId);
    const trip = booking && (await this.trips.findById(booking.trajetId));
    if (!booking || !trip || trip.chauffeurId !== driver.id) {
      throw new DomainException('not_found', 'Réservation introuvable.');
    }
    if (!expected.includes(booking.statut)) {
      throw new DomainException('conflict', 'Cette action n’est pas possible à cette étape de la course.');
    }
    return { booking, trip };
  }
}
