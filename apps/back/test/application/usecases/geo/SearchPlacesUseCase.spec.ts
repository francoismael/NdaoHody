import { SearchPlacesUseCase } from '../../../../src/application/usecases/geo/SearchPlacesUseCase';
import { ANALAKELY, FixedPlaces, PARIS } from '../../../support/inMemoryGeo';

describe('SearchPlacesUseCase', () => {
  it('asks the map service for suggestions near the user', async () => {
    const places = new FixedPlaces();
    const useCase = new SearchPlacesUseCase(places);

    await expect(useCase.suggest('Anala', 'session-1', ANALAKELY)).resolves.toHaveLength(1);
    expect(places.asked).toEqual([{ text: 'Anala', near: ANALAKELY }]);
  });

  it('does not call the map service for a single letter', async () => {
    const places = new FixedPlaces();

    await expect(new SearchPlacesUseCase(places).suggest('A', 'session-1', null)).resolves.toEqual([]);
    expect(places.asked).toHaveLength(0);
  });

  it('ignores a position outside Madagascar (emulator, GPS error)', async () => {
    const places = new FixedPlaces();

    await new SearchPlacesUseCase(places).suggest('Analakely', 'session-1', PARIS);

    expect(places.asked[0]?.near).toBeNull();
  });

  it('answers 404 when a chosen place no longer exists', async () => {
    const useCase = new SearchPlacesUseCase(new FixedPlaces(null));

    await expect(useCase.retrieve('poi.gone', 'session-1')).rejects.toMatchObject({ reason: 'not_found' });
  });

  it('names the area at a point in Madagascar only', async () => {
    const useCase = new SearchPlacesUseCase(new FixedPlaces());

    await expect(useCase.areaName(ANALAKELY)).resolves.toEqual({ libelle: 'Analakely' });
    await expect(useCase.areaName(PARIS)).rejects.toMatchObject({ reason: 'invalid' });
  });
});
