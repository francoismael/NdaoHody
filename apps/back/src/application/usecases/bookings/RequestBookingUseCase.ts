import { Injectable, Logger } from '@nestjs/common';
import type { Lieu, Reservation } from '@contract';
import type { Booking } from '../../../domain/entity/Booking';
import { seatPrice, totalPrice } from '../../../domain/entity/pricing';
import { isBookable, type Trip } from '../../../domain/entity/Trip';
import { isProfileComplete, type User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { BlockRepository } from '../../../domain/repository/BlockRepository';
import { BookingRepository } from '../../../domain/repository/BookingRepository';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { TariffRepository } from '../../../domain/repository/TariffRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { CreateBookingRequest } from '../../dto/BookingRequests';
import { notifyBestEffort } from '../../helper/bestEffort';
import { addMs, SECOND_MS } from '../../helper/durations';
import { assertInMadagascar } from '../../helper/geoRules';
import { toReservation } from '../../helper/rideViews';
import { MAX_RETRIES, readSetting, RESPONSE_DELAY_SECONDS, ROUTE_MARGIN_METRES } from '../../helper/settings';
import { Clock } from '../../port/Clock';
import { RealtimePublisher } from '../../port/RealtimePublisher';
import { UserNotifier } from '../../port/UserNotifier';

const TRIP_NOT_FOUND_MESSAGE = 'Trajet introuvable.';

interface BookingWish {
  places: number;
  priseEnCharge: Lieu;
  depose: Lieu;
}

/**
 * POST /reservations: a passenger asks the driver for seats; the driver has 3 min to answer.
 * POST /reservations/:id/retry: the same request again after it expired (2 times at most).
 * The price is computed here, from the driver's road between pickup and drop-off, then frozen.
 */
@Injectable()
export class RequestBookingUseCase {
  private readonly logger = new Logger(RequestBookingUseCase.name);

  constructor(
    private readonly trips: TripRepository,
    private readonly bookings: BookingRepository,
    private readonly vehicles: VehicleRepository,
    private readonly tariffs: TariffRepository,
    private readonly blocks: BlockRepository,
    private readonly settings: SettingRepository,
    private readonly notifier: UserNotifier,
    private readonly realtime: RealtimePublisher,
    private readonly clock: Clock,
  ) {}

  async create(passenger: User, request: CreateBookingRequest): Promise<Reservation> {
    const trip = await this.trips.findById(request.trajetId);
    return toReservation(await this.request(passenger, trip, request, null));
  }

  async retry(passenger: User, bookingId: number): Promise<Reservation> {
    const previous = await this.bookings.findById(bookingId);
    if (!previous || previous.passagerId !== passenger.id) {
      throw new DomainException('not_found', 'Demande introuvable.');
    }
    if (previous.statut !== 'expiree') {
      throw new DomainException('conflict', 'Seule une demande expirée peut être relancée.');
    }
    const maxRetries = await readSetting(this.settings, MAX_RETRIES);
    if ((await this.bookings.countRetries(previous.id)) >= maxRetries) {
      throw new DomainException('too_many_requests', `Tu as déjà relancé ce chauffeur ${maxRetries} fois. Cherche un autre chauffeur.`);
    }
    const trip = await this.trips.findById(previous.trajetId);
    return toReservation(await this.request(passenger, trip, previous, previous.id));
  }

  private async request(passenger: User, trip: Trip | null, wish: BookingWish, relanceDe: number | null): Promise<Booking> {
    if (!trip || (trip.reserveFemmes && passenger.sexe !== 'femme')) {
      // A women-only trip is refused to a man even when he calls the API directly.
      throw new DomainException(trip ? 'forbidden' : 'not_found', trip ? 'Ce trajet est réservé aux femmes.' : TRIP_NOT_FOUND_MESSAGE);
    }
    this.assertCanAsk(passenger, trip, wish);
    if (await this.blocks.areBlocked(passenger.id, trip.chauffeurId)) {
      throw new DomainException('forbidden', 'Tu ne peux pas réserver ce trajet.');
    }
    if (await this.bookings.findActive(trip.id, passenger.id)) {
      throw new DomainException('conflict', 'Tu as déjà une demande en cours sur ce trajet.');
    }
    assertInMadagascar(wish.priseEnCharge, wish.depose);

    const margin = await readSetting(this.settings, ROUTE_MARGIN_METRES);
    const match = await this.trips.measure(trip.id, wish.priseEnCharge, wish.depose, margin);
    if (!match) {
      throw new DomainException('invalid', 'Ta prise en charge et ta dépose doivent être sur le chemin du chauffeur, dans le bon sens.');
    }
    if (trip.statut !== 'publie' && match.fractionChauffeur !== null && match.fractionChauffeur >= match.fractionPriseEnCharge) {
      throw new DomainException('conflict', 'Le chauffeur est déjà passé à ton point de prise en charge.');
    }

    const vehicle = await this.vehicles.findById(trip.vehiculeId);
    if (!vehicle) {
      throw new DomainException('not_found', TRIP_NOT_FOUND_MESSAGE);
    }
    const prixParPlace = seatPrice(match.distanceMetres, await this.tariffs.findByVehicleType(vehicle.type));
    const now = this.clock.now();
    const delaySeconds = await readSetting(this.settings, RESPONSE_DELAY_SECONDS);

    const booking = await this.bookings.create({
      trajetId: trip.id,
      passagerId: passenger.id,
      places: wish.places,
      distanceMetres: match.distanceMetres,
      prixParPlace,
      prixTotal: totalPrice(prixParPlace, wish.places),
      priseEnCharge: { libelle: wish.priseEnCharge.libelle, ...match.priseEnCharge },
      depose: { libelle: wish.depose.libelle, ...match.depose },
      relanceDe,
      dateDemande: now.toISOString(),
      dateExpiration: addMs(now, delaySeconds * SECOND_MS).toISOString(),
    });

    this.realtime.toUser(trip.chauffeurId, 'booking-requested', toReservation(booking));
    await notifyBestEffort(this.logger, this.notifier, {
      utilisateurId: trip.chauffeurId,
      type: 'nouvelle_demande',
      titre: 'Nouvelle demande',
      message: `${passenger.prenom ?? 'Un passager'} demande ${wish.places} place(s). Réponds dans les ${Math.round(delaySeconds / 60)} min.`,
      donnees: { reservationId: booking.id, trajetId: trip.id },
    });
    return booking;
  }

  private assertCanAsk(passenger: User, trip: Trip, wish: BookingWish): void {
    if (!isProfileComplete(passenger)) {
      throw new DomainException('invalid', 'Complète ton profil (nom, prénom, sexe) avant de réserver.');
    }
    if (trip.chauffeurId === passenger.id) {
      throw new DomainException('invalid', 'Tu ne peux pas réserver ton propre trajet.');
    }
    if (!isBookable(trip)) {
      throw new DomainException('conflict', 'Ce trajet est terminé ou annulé.');
    }
    if (wish.places > trip.placesLibres) {
      throw new DomainException('conflict', `Il ne reste que ${trip.placesLibres} place(s) sur ce trajet.`);
    }
  }
}
