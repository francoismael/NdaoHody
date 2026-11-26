/**
 * Fakes of the map ports (unit tests: Mapbox is never called).
 */
import type { Lieu, Position } from '@contract';
import { PlaceSearch, PlaceSuggestion } from '../../src/application/port/PlaceSearch';
import { DrivingRoute, RouteProvider } from '../../src/application/port/RouteProvider';

/** Straight line between the stops, 10 m/s; counts the calls. */
export class StraightLineRoutes extends RouteProvider {
  calls = 0;

  async route(stops: readonly Position[]): Promise<DrivingRoute> {
    this.calls += 1;
    return {
      chemin: stops.map(({ longitude, latitude }) => [longitude, latitude]),
      distanceMetres: 1000,
      dureeSecondes: 100 * this.calls,
      pointsSurRoute: [...stops],
    };
  }
}

export class FixedPlaces extends PlaceSearch {
  readonly asked: { text: string; near: Position | null }[] = [];

  constructor(private readonly known: Lieu | null = { libelle: 'Analakely', latitude: -18.9067, longitude: 47.5253 }) {
    super();
  }

  async suggest(text: string, _session: string, near: Position | null): Promise<PlaceSuggestion[]> {
    this.asked.push({ text, near });
    return [{ id: 'poi.1', nom: 'Analakely', detail: 'Antananarivo' }];
  }

  async retrieve(): Promise<Lieu | null> {
    return this.known;
  }

  async areaName(): Promise<string | null> {
    return 'Analakely';
  }
}

/** Andoharanofotsy and Analakely, as in donnees.sql. */
export const ANDOHARANOFOTSY: Position = { latitude: -18.985, longitude: 47.533 };
export const ANALAKELY: Position = { latitude: -18.9067, longitude: 47.5253 };
export const PARIS: Position = { latitude: 48.8566, longitude: 2.3522 };
