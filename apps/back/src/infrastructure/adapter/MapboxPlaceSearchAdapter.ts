import { Injectable } from '@nestjs/common';
import type { Lieu, Position } from '@contract';
import { PlaceSearch, PlaceSuggestion } from '../../application/port/PlaceSearch';
import { isRecord, text } from '../../application/helper/json';
import { MapboxClient } from './MapboxClient';

const SUGGESTION_LIMIT = 6;
const COUNTRY = 'mg';
const LANGUAGE = 'fr';
/** Area names only, most precise first: a building or a shop is never returned. */
const AREA_TYPES = 'neighborhood,locality,place';

/**
 * Mapbox Search Box (suggest, then retrieve: made for a search bar, knows shops and places)
 * and Geocoding v6 reverse (name of the area at a point).
 */
@Injectable()
export class MapboxPlaceSearchAdapter extends PlaceSearch {
  constructor(private readonly mapbox: MapboxClient) {
    super();
  }

  async suggest(text: string, session: string, near: Position | null): Promise<PlaceSuggestion[]> {
    const { body } = await this.mapbox.get('search', '/search/searchbox/v1/suggest', {
      q: text,
      session_token: session,
      language: LANGUAGE,
      country: COUNTRY,
      limit: String(SUGGESTION_LIMIT),
      proximity: near ? `${near.longitude},${near.latitude}` : undefined,
    });
    return parseSuggestions(body);
  }

  async retrieve(id: string, session: string): Promise<Lieu | null> {
    const { body } = await this.mapbox.get('search', `/search/searchbox/v1/retrieve/${encodeURIComponent(id)}`, {
      session_token: session,
      language: LANGUAGE,
    });
    return parseRetrieved(body);
  }

  async areaName({ latitude, longitude }: Position): Promise<string | null> {
    const { body } = await this.mapbox.get('geocoding', '/search/geocode/v6/reverse', {
      latitude: String(latitude),
      longitude: String(longitude),
      types: AREA_TYPES,
      language: LANGUAGE,
    });
    return parseAreaName(body);
  }
}

function firstFeature(body: unknown): Record<string, unknown> | null {
  const features = isRecord(body) ? body['features'] : undefined;
  const feature = Array.isArray(features) ? (features[0] as unknown) : undefined;
  return isRecord(feature) ? feature : null;
}

/** Exported for the tests. */
export function parseSuggestions(body: unknown): PlaceSuggestion[] {
  const suggestions = isRecord(body) ? body['suggestions'] : undefined;
  if (!Array.isArray(suggestions)) {
    return [];
  }
  return suggestions.flatMap((item: unknown): PlaceSuggestion[] => {
    if (!isRecord(item)) {
      return [];
    }
    const id = text(item['mapbox_id']);
    const nom = text(item['name']);
    return id && nom ? [{ id, nom, detail: text(item['place_formatted']) ?? text(item['full_address']) }] : [];
  });
}

/** Exported for the tests. */
export function parseRetrieved(body: unknown): Lieu | null {
  const feature = firstFeature(body);
  const geometry = feature?.['geometry'];
  const properties = feature?.['properties'];
  const coordinates = isRecord(geometry) ? geometry['coordinates'] : undefined;
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
    return null;
  }
  return {
    libelle: (isRecord(properties) ? text(properties['name']) : null) ?? 'Lieu choisi',
    longitude: coordinates[0],
    latitude: coordinates[1],
  };
}

/** Exported for the tests. */
export function parseAreaName(body: unknown): string | null {
  const properties = firstFeature(body)?.['properties'];
  return isRecord(properties) ? text(properties['name']) : null;
}
