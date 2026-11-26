import { Injectable, Logger } from '@nestjs/common';
import type { Trajet } from '@contract';
import { ACTIVE_BOOKING_STATUSES } from '../../../domain/entity/Booking';
import { plannedArrival, type Trip, type TripChanges } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import type { UpdateTripRequest } from '../../dto/TripRequests';
import { notifyBestEffort } from '../../helper/bestEffort';
import { MINUTE_MS } from '../../helper/durations';
import { assertDepartureDate, START_EARLY_MINUTES } from '../../helper/tripRules';
import { Clock } from '../../port/Clock';
import { UnitOfWork } from '../../port/UnitOfWork';
import { UserNotifier } from '../../port/UserNotifier';
import { TripCancellationService } from '../../service/TripCancellationService';

const TRIP_NOT_FOUND_MESSAGE = 'Trajet introuvable.';

/** GET /trips/:id, GET /me/trips, GET /me/trips/active, POST /trips/:id/start, PATCH /trips/:id, POST /trips/:id/cancel. */
@Injectable()
export class ManageTripsUseCase {
  private readonly logger = new Logger(ManageTripsUseCase.name);

  constructor(
    private readonly trips: TripRepository,
    private readonly bookings: BookingRepository,
    private readonly positions: DriverPositionRepository,
    private readonly settings: SettingRepository,
    private readonly cancellation: TripCancellationService,
    private readonly notifier: UserNotifier,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  /** A women-only trip does not exist for a man (same answer as an unknown trip). */
  async get(viewer: User, tripId: number): Promise<Trajet> {
    const trip = await this.trips.findById(tripId);
    if (!trip || (trip.reserveFemmes && viewer.sexe !== 'femme' && trip.chauffeurId !== viewer.id)) {
      throw new DomainException('not_found', TRIP_NOT_FOUND_MESSAGE);
    }
    return trip;
  }

  listMine(driver: User): Promise<Trajet[]> {
    return this.trips.listByDriver(driver.id);
  }

  active(driver: User): Promise<Trajet | null> {
    return this.trips.findOnTheRoad(driver.id);
  }

  /** "Je pars" for a trip planned ahead: from 30 min before its time. */
  async start(driver: User, tripId: number): Promise<Trajet> {
    const trip = await this.findOwn(driver, tripId);
    if (trip.statut !== 'publie') {
      throw new DomainException('conflict', 'Ce trajet est déjà parti, terminé ou annulé.');
    }
    const now = this.clock.now();
    const earliest = new Date(trip.dateDepart).getTime() - START_EARLY_MINUTES * MINUTE_MS;
    if (now.getTime() < earliest) {
      throw new DomainException('conflict', `Trop tôt : tu pourras partir ${START_EARLY_MINUTES} min avant l’heure prévue.`);
    }
    if (await this.trips.findOnTheRoad(driver.id)) {
      throw new DomainException('conflict', 'Tu as déjà un trajet en route. Termine-le d’abord.');
    }

    return this.unitOfWork.run(async () => {
      const started = await this.trips.update(trip.id, { statut: 'en_route' });
      await this.positions.save(driver.id, trip.id, started.depart, true, now);
      return started;
    });
  }

  /** Before departure only; the passengers with a request or a seat are told. */
  async update(driver: User, tripId: number, request: UpdateTripRequest): Promise<Trajet> {
    const trip = await this.findOwn(driver, tripId);
    if (trip.statut !== 'publie') {
      throw new DomainException('conflict', 'Un trajet parti, terminé ou annulé ne se modifie plus.');
    }

    const changes: TripChanges = {};
    if (request.dateDepart !== undefined) {
      const date = new Date(request.dateDepart);
      await assertDepartureDate(this.settings, date, this.clock.now());
      const arrival = plannedArrival({ dateDepart: date.toISOString(), dureeSecondes: trip.dureeSecondes });
      if (await this.trips.hasOverlap(driver.id, date, arrival, trip.id)) {
        throw new DomainException('conflict', 'Tu as déjà un trajet prévu à cette heure-là.');
      }
      changes.dateDepart = date.toISOString();
    }
    if (request.placesTotal !== undefined) {
      const taken = trip.placesTotal - trip.placesLibres;
      if (request.placesTotal < taken) {
        throw new DomainException('conflict', `${taken} place(s) sont déjà réservées : tu ne peux pas en proposer moins.`);
      }
      changes.placesTotal = request.placesTotal;
      changes.placesLibres = request.placesTotal - taken;
    }
    if (Object.keys(changes).length === 0) {
      return trip;
    }

    const updated = await this.trips.update(trip.id, changes);
    const passengers = await this.bookings.listOnTrip(trip.id, ACTIVE_BOOKING_STATUSES);
    await Promise.all(
      passengers.map((booking) =>
        notifyBestEffort(this.logger, this.notifier, {
          utilisateurId: booking.passagerId,
          type: 'trajet_modifie',
          titre: 'Trajet modifié',
          message: 'Le chauffeur a modifié son trajet : vérifie l’heure de départ.',
          donnees: { trajetId: trip.id, reservationId: booking.id },
        }),
      ),
    );
    return updated;
  }

  /** Refused once a passenger is on board: the ride must be ended instead. */
  async cancel(driver: User, tripId: number): Promise<Trajet> {
    const trip = await this.findOwn(driver, tripId);
    if (trip.statut === 'termine' || trip.statut === 'annule') {
      throw new DomainException('conflict', 'Ce trajet est déjà terminé ou annulé.');
    }
    if ((await this.bookings.listOnTrip(trip.id, ['en_course'])).length > 0) {
      throw new DomainException('conflict', 'Des passagers sont à bord : termine la course au lieu d’annuler.');
    }
    return this.cancellation.cancel(trip, 'chauffeur');
  }

  private async findOwn(driver: User, tripId: number): Promise<Trip> {
    const trip = await this.trips.findById(tripId);
    if (!trip || trip.chauffeurId !== driver.id) {
      throw new DomainException('not_found', TRIP_NOT_FOUND_MESSAGE);
    }
    return trip;
  }
}
