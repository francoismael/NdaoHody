import { Injectable } from '@nestjs/common';
import type { Lieu, Position } from '@contract';
import { isInMadagascar } from '../../../domain/entity/geo';
import { DomainException } from '../../../domain/exception/DomainException';
import type { AreaNameResponse } from '../../dto/GeoResponses';
import { assertInMadagascar } from '../../helper/geoRules';
import { PlaceSearch, type PlaceSuggestion } from '../../port/PlaceSearch';

/** Fewer letters give too many answers for nothing (and each call is billed). */
export const MIN_SEARCH_LENGTH = 2;

/**
 * GET /geo/places, /geo/places/:id and /geo/area: finding and naming places.
 * The Mapbox key stays on the server: the app never calls Mapbox for this.
 */
@Injectable()
export class SearchPlacesUseCase {
  constructor(private readonly places: PlaceSearch) {}

  suggest(text: string, session: string, near: Position | null): Promise<PlaceSuggestion[]> {
    if (text.length < MIN_SEARCH_LENGTH) {
      return Promise.resolve([]);
    }
    // A position outside Madagascar (emulator, GPS error) would only push the right places down.
    return this.places.suggest(text, session, near && isInMadagascar(near) ? near : null);
  }

  async retrieve(id: string, session: string): Promise<Lieu> {
    const place = await this.places.retrieve(id, session);
    if (!place) {
      throw new DomainException('not_found', 'Ce lieu est introuvable. Fais une nouvelle recherche.');
    }
    return place;
  }

  async areaName(position: Position): Promise<AreaNameResponse> {
    assertInMadagascar(position);
    return { libelle: await this.places.areaName(position) };
  }
}
