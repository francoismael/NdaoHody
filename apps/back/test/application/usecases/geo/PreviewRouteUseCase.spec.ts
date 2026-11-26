import { PreviewRouteUseCase } from '../../../../src/application/usecases/geo/PreviewRouteUseCase';
import { ANALAKELY, ANDOHARANOFOTSY, PARIS, StraightLineRoutes } from '../../../support/inMemoryGeo';

describe('PreviewRouteUseCase', () => {
  it('gives the road, its distance, its duration and both points on the road', async () => {
    const useCase = new PreviewRouteUseCase(new StraightLineRoutes());

    const preview = await useCase.execute(ANDOHARANOFOTSY, ANALAKELY);

    expect(preview).toMatchObject({ distanceMetres: 1000, dureeSecondes: 100 });
    expect(preview.departSurRoute).toEqual(ANDOHARANOFOTSY);
    expect(preview.arriveeSurRoute).toEqual(ANALAKELY);
    expect(preview.chemin[0]).toEqual([ANDOHARANOFOTSY.longitude, ANDOHARANOFOTSY.latitude]);
  });

  it('refuses a point outside Madagascar without calling the map service', async () => {
    const routes = new StraightLineRoutes();
    const useCase = new PreviewRouteUseCase(routes);

    await expect(useCase.execute(ANDOHARANOFOTSY, PARIS)).rejects.toMatchObject({ reason: 'invalid' });
    expect(routes.calls).toBe(0);
  });

  it('refuses a departure and an arrival at the same place', async () => {
    const useCase = new PreviewRouteUseCase(new StraightLineRoutes());

    await expect(useCase.execute(ANALAKELY, ANALAKELY)).rejects.toMatchObject({ reason: 'invalid' });
  });
});
