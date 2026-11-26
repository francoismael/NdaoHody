import {
  parseAreaName,
  parseRetrieved,
  parseSuggestions,
} from '../../../src/infrastructure/adapter/MapboxPlaceSearchAdapter';

describe('MapboxPlaceSearchAdapter: reading Mapbox Search and Geocoding', () => {
  it('reads search suggestions and skips incomplete ones', () => {
    const suggestions = parseSuggestions({
      suggestions: [
        { mapbox_id: 'poi.1', name: 'Analakely', place_formatted: 'Antananarivo, Madagascar' },
        { mapbox_id: 'poi.2' },
      ],
    });

    expect(suggestions).toEqual([{ id: 'poi.1', nom: 'Analakely', detail: 'Antananarivo, Madagascar' }]);
  });

  it('reads the coordinates of a chosen place', () => {
    const place = parseRetrieved({
      features: [{ geometry: { coordinates: [47.5253, -18.9067] }, properties: { name: 'Analakely' } }],
    });

    expect(place).toEqual({ libelle: 'Analakely', latitude: -18.9067, longitude: 47.5253 });
    expect(parseRetrieved({ features: [] })).toBeNull();
  });

  it('reads the name of an area, null when there is none', () => {
    expect(parseAreaName({ features: [{ properties: { name: 'Isoraka' } }] })).toBe('Isoraka');
    expect(parseAreaName({ features: [] })).toBeNull();
  });
});
