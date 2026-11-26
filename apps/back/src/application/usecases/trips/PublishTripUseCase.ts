import { Injectable } from '@nestjs/common';
import type { Trajet } from '@contract';
import type { NewTrip } from '../../../domain/entity/Trip';
import type { User } from '../../../domain/entity/User';
import type { Vehicle } from '../../../domain/entity/Vehicle';
import { DomainException } from '../../../domain/exception/DomainException';
import { DriverPositionRepository } from '../../../domain/repository/DriverPositionRepository';
import { SettingRepository } from '../../../domain/repository/SettingRepository';
import { TripRepository } from '../../../domain/repository/TripRepository';
import { VehicleRepository } from '../../../domain/repository/VehicleRepository';
import type { PublishTripRequest } from '../../dto/TripRequests';
import { assertDepartureDate } from '../../helper/tripRules';
import { Clock } from '../../port/Clock';
import { UnitOfWork } from '../../port/UnitOfWork';
import { PreviewRouteUseCase } from '../geo/PreviewRouteUseCase';

/**
 * POST /trips: a validated driver publishes a trip, leaving now or later.
 * The road is computed by the server (Mapbox): the app never sends it, so nobody can fake a path or a distance.
 * No price on the trip: each passenger pays for his own part (step 8).
 */
@Injectable()
export class PublishTripUseCase {
  constructor(
    private readonly trips: TripRepository,
    private readonly vehicles: VehicleRepository,
    private readonly positions: DriverPositionRepository,
    private readonly settings: SettingRepository,
    private readonly routes: PreviewRouteUseCase,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(driver: User, request: PublishTripRequest): Promise<Trajet> {
    if (driver.statutChauffeur !== 'valide') {
      throw new DomainException('forbidden', 'Ton dossier chauffeur doit être validé avant de publier un trajet.');
    }
    if (request.reserveFemmes && driver.sexe !== 'femme') {
      throw new DomainException('forbidden', 'Seule une conductrice peut publier un trajet réservé aux femmes.');
    }
    const vehicle = await this.chooseVehicle(driver, request.vehiculeId);
    if (request.placesTotal > vehicle.places) {
      throw new DomainException('invalid', `Ce véhicule a ${vehicle.places} place(s) passager au plus.`);
    }

    const now = this.clock.now();
    const immediate = request.type === 'immediat';
    const dateDepart = immediate ? now : await this.plannedDeparture(request.dateDepart, now);
    const route = await this.routes.execute(request.depart, request.arrivee);

    if (immediate) {
      if (await this.trips.findOnTheRoad(driver.id)) {
        throw new DomainException('conflict', 'Tu as déjà un trajet en route. Termine-le avant d’en publier un autre.');
      }
    } else {
      const arrival = new Date(dateDepart.getTime() + route.dureeSecondes * 1000);
      if (await this.trips.hasOverlap(driver.id, dateDepart, arrival, null)) {
        throw new DomainException('conflict', 'Tu as déjà un trajet prévu à cette heure-là.');
      }
    }

    const trip: NewTrip = {
      chauffeurId: driver.id,
      vehiculeId: vehicle.id,
      type: request.type,
      statut: immediate ? 'en_route' : 'publie',
      // The points the driver chose, moved onto the road.
      depart: { libelle: request.depart.libelle, ...route.departSurRoute },
      arrivee: { libelle: request.arrivee.libelle, ...route.arriveeSurRoute },
      chemin: route.chemin,
      distanceMetres: route.distanceMetres,
      dureeSecondes: route.dureeSecondes,
      dateDepart: dateDepart.toISOString(),
      placesTotal: request.placesTotal,
      placesLibres: request.placesTotal,
      reserveFemmes: request.reserveFemmes ?? false,
    };

    return this.unitOfWork.run(async () => {
      const created = await this.trips.create(trip);
      if (immediate) {
        // He is at the departure: passengers further on the road can find him at once.
        await this.positions.save(driver.id, created.id, route.departSurRoute, true, now);
      }
      return created;
    });
  }

  /**
   * A driver may own several vehicles (e.g. 2 cars and a motorbike).
   * Only one validated: it is used, no choice to make. Several: the app asks him and sends vehiculeId.
   */
  private async chooseVehicle(driver: User, vehiculeId: number | undefined): Promise<Vehicle> {
    if (vehiculeId === undefined) {
      const usable = (await this.vehicles.listByOwner(driver.id)).filter((candidate) => candidate.statut === 'valide');
      if (usable.length === 0) {
        throw new DomainException('forbidden', 'Ajoute un véhicule et attends sa validation avant de publier un trajet.');
      }
      if (usable.length > 1) {
        throw new DomainException('invalid', 'Choisis le véhicule de ce trajet.', {
          vehicules: usable.map(({ id, type, marque, modele, immatriculation }) => ({ id, type, marque, modele, immatriculation })),
        });
      }
      return usable[0] as Vehicle;
    }

    const vehicle = await this.vehicles.findById(vehiculeId);
    if (!vehicle || vehicle.utilisateurId !== driver.id || vehicle.statut === 'archive') {
      throw new DomainException('invalid', 'Choisis un de tes véhicules.');
    }
    if (vehicle.statut !== 'valide') {
      throw new DomainException('forbidden', 'Ce véhicule doit être validé avant de publier un trajet.');
    }
    return vehicle;
  }

  private async plannedDeparture(dateDepart: string | undefined, now: Date): Promise<Date> {
    if (!dateDepart) {
      throw new DomainException('invalid', 'Indique la date et l’heure de départ.');
    }
    const date = new Date(dateDepart);
    await assertDepartureDate(this.settings, date, now);
    return date;
  }
}
