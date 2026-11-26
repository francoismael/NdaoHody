import { parseDirections } from '../../../src/infrastructure/adapter/MapboxRouteProviderAdapter';

/** Shortened copies of real Mapbox answers. */
const DIRECTIONS_OK = {
  code: 'Ok',
  routes: [
    {
      distance: 9126.4,
      duration: 1312.7,
      geometry: {
        type: 'LineString',
        coordinates: [
          [47.53301, -18.98502],
          [47.52801, -18.96003],
          [47.52532, -18.90671],
        ],
      },
    },
  ],
  waypoints: [
    { name: 'Route Nationale 7', location: [47.53301, -18.98502] },
    { name: 'Avenue de l’Indépendance', location: [47.52532, -18.90671] },
  ],
};

describe('MapboxRouteProviderAdapter: reading Mapbox Directions', () => {
  it('reads a route: path, rounded distance and duration, points on the road', () => {
    const route = parseDirections(DIRECTIONS_OK);

    expect(route.distanceMetres).toBe(9126);
    expect(route.dureeSecondes).toBe(1313);
    expect(route.chemin).toHaveLength(3);
    expect(route.pointsSurRoute).toEqual([
      { latitude: -18.98502, longitude: 47.53301 },
      { latitude: -18.90671, longitude: 47.52532 },
    ]);
  });

  it('turns "no road" into a clear 400', () => {
    expect(() => parseDirections({ code: 'NoRoute', routes: [] })).toThrow(expect.objectContaining({ reason: 'invalid' }));
  });

  it('turns a broken answer into a 503', () => {
    expect(() => parseDirections({ code: 'Ok', routes: [{}] })).toThrow(expect.objectContaining({ reason: 'unavailable' }));
  });

});
