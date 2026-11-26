import { Injectable } from '@nestjs/common';
import type { ResultatRecherche, Tarif, TypeVehicule } from '@contract';
import { seatPrice, totalPrice } from '../../../domain/entity/pricing';
import type { Trip } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import { DomainException } from '../../../domain/exception/DomainException';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { TariffRepository } from '../../../domain/repository/TariffRepository';
import { TripRepository, type TripMatch } from '../../../domain/repository/TripRepository';
import { UserRepository } from '../../../domain/repository/UserRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { SearchTripsRequest } from '../../dto/TripRequests';
import { DAY_MS, MINUTE_MS } from '../../helper/durations';
import { assertInMadagascar } from '../../helper/geoRules';
import { toPublicProfile, toVehicleSummary } from '../../helper/rideViews';
import { MAX_DAYS_AHEAD, readSetting, ROUTE_MARGIN_METRES } from '../../helper/settings';
import { Clock } from '../../port/Clock';

export const NOW = 'maintenant';
/** A trip planned ahead matches when it passes by the passenger from 15 min before to 60 min after the wanted time. */
export const WINDOW_BEFORE_MINUTES = 15;
export const WINDOW_AFTER_MINUTES = 60;
export const MAX_RESULTS = 20;

interface Timing {
  arriveeDansMinutes: number | null;
  heurePassage: string | null;
  /** Milliseconds between the wanted time and the driver at the pickup point: smaller is better. */
  ecart: number;
}

/**
 * POST /trips/search: "the driver passes on my way".
 *   A ●━━━━━━━● B ━━━━━━━● C ━━━━━━━● D   (driver A -> D, passenger B -> C)
 * B and C on the driver's path (30 m GPS margin), B before C, enough free seats,
 * driver on the road not yet past B, or a planned trip passing by B at the wanted time.
 * Rated drivers first (best rating first), then the others; then the soonest.
 */
@Injectable()
export class SearchTripsUseCase {
  constructor(
    private readonly trips: TripRepository,
    private readonly users: UserRepository,
    private readonly vehicles: VehicleRepository,
    private readonly tariffs: TariffRepository,
    private readonly settings: SettingRepository,
    private readonly clock: Clock,
  ) {}

  async execute(passenger: User, request: SearchTripsRequest): Promise<ResultatRecherche[]> {
    assertInMadagascar(request.depart, request.destination);
    const now = this.clock.now();
    const wanted = await this.wantedTime(request.quand, now);

    const matches = await this.trips.findCandidates({
      priseEnCharge: request.depart,
      depose: request.destination,
      places: request.places,
      margeMetres: await readSetting(this.settings, ROUTE_MARGIN_METRES),
      passagerId: passenger.id,
      passagerEstUneFemme: passenger.sexe === 'femme',
      femmesSeulement: passenger.sexe === 'femme' && request.femmesSeulement === true,
    });

    const tariffs = new Map<TypeVehicule, Tarif>();
    const results: { result: ResultatRecherche; ecart: number }[] = [];
    for (const match of matches) {
      const trip = await this.trips.findById(match.tripId);
      const timing = trip && timingOf(trip, match, now, wanted);
      if (!trip || !timing) {
        continue;
      }
      const [driver, vehicle] = await Promise.all([this.users.findById(trip.chauffeurId), this.vehicles.findById(trip.vehiculeId)]);
      if (!driver || !vehicle) {
        continue;
      }
      const tarif = tariffs.get(vehicle.type) ?? (await this.tariffs.findByVehicleType(vehicle.type));
      tariffs.set(vehicle.type, tarif);
      const prixParPlace = seatPrice(match.distanceMetres, tarif);

      const result: ResultatRecherche = {
        trajet: trip,
        chauffeur: toPublicProfile(driver),
        vehicule: toVehicleSummary(vehicle),
        priseEnCharge: { libelle: request.depart.libelle, ...match.priseEnCharge },
        depose: { libelle: request.destination.libelle, ...match.depose },
        arriveeDansMinutes: timing.arriveeDansMinutes,
        heurePassage: timing.heurePassage,
        distanceMetres: match.distanceMetres,
        prixParPlace,
        prixTotal: totalPrice(prixParPlace, request.places),
      };
      results.push({ result, ecart: timing.ecart });
    }

    return results
      .sort(byRatingThenSoonest)
      .slice(0, MAX_RESULTS)
      .map(({ result }) => result);
  }

  private async wantedTime(quand: string, now: Date): Promise<Date> {
    if (quand === NOW) {
      return now;
    }
    const date = new Date(quand);
    const maxDays = await readSetting(this.settings, MAX_DAYS_AHEAD);
    if (Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + maxDays * DAY_MS) {
      throw new DomainException('invalid', `"quand" : "${NOW}" ou une date dans les ${maxDays} prochains jours.`);
    }
    return date.getTime() < now.getTime() ? now : date;
  }
}

/** When the driver reaches the pickup point; null when this trip does not fit the wanted time. */
export function timingOf(trip: Trip, match: TripMatch, now: Date, wanted: Date): Timing | null {
  const toPickupMs = (fromFraction: number): number =>
    Math.max(0, match.fractionPriseEnCharge - fromFraction) * trip.dureeSecondes * 1000;

  if (trip.statut === 'publie') {
    const passage = new Date(new Date(trip.dateDepart).getTime() + toPickupMs(0));
    const tooEarly = passage.getTime() < wanted.getTime() - WINDOW_BEFORE_MINUTES * MINUTE_MS;
    const tooLate = passage.getTime() > wanted.getTime() + WINDOW_AFTER_MINUTES * MINUTE_MS;
    if (tooEarly || tooLate || passage.getTime() < now.getTime()) {
      return null;
    }
    return { arriveeDansMinutes: null, heurePassage: passage.toISOString(), ecart: Math.abs(passage.getTime() - wanted.getTime()) };
  }

  // On the road: only for "now" (or soon), and only if he has not passed the pickup point yet.
  if (wanted.getTime() > now.getTime() + WINDOW_AFTER_MINUTES * MINUTE_MS) {
    return null;
  }
  if (match.fractionChauffeur === null || match.fractionChauffeur >= match.fractionPriseEnCharge) {
    return null;
  }
  const ms = toPickupMs(match.fractionChauffeur);
  return { arriveeDansMinutes: Math.max(1, Math.ceil(ms / MINUTE_MS)), heurePassage: null, ecart: ms };
}

function byRatingThenSoonest(a: { result: ResultatRecherche; ecart: number }, b: { result: ResultatRecherche; ecart: number }): number {
  const noteA = a.result.chauffeur.noteMoyenne;
  const noteB = b.result.chauffeur.noteMoyenne;
  if (noteA !== noteB) {
    if (noteA === null) return 1;
    if (noteB === null) return -1;
    return noteB - noteA;
  }
  return a.ecart - b.ecart;
}
