import { computeBadge, isUpgrade, type BadgeFacts } from '../../../src/domain/entity/badge';
import { makeUser } from '../../support/inMemory';

const passenger = (overrides: Partial<BadgeFacts['user']>): BadgeFacts => ({
  user: makeUser({ statutChauffeur: 'aucun', coursesPassager: 0, absences: 0, ...overrides }),
  hasValidatedVehicle: false,
  confirmedReports: 0,
});

const driver = (overrides: Partial<BadgeFacts['user']>, facts: Partial<BadgeFacts> = {}): BadgeFacts => ({
  user: makeUser({ statutChauffeur: 'valide', coursesChauffeur: 0, noteMoyenne: null, ...overrides }),
  hasValidatedVehicle: true,
  confirmedReports: 0,
  ...facts,
});

describe('computeBadge — passenger', () => {
  it('non_verifie while the profile is incomplete', () => {
    expect(computeBadge(passenger({ nom: null }))).toBe('non_verifie');
  });

  it('nouveau below 3 rides, verifie from 3 rides', () => {
    expect(computeBadge(passenger({ coursesPassager: 2 }))).toBe('nouveau');
    expect(computeBadge(passenger({ coursesPassager: 3 }))).toBe('verifie');
  });

  it('top from 20 rides when never absent (passengers are not rated)', () => {
    expect(computeBadge(passenger({ coursesPassager: 20 }))).toBe('top');
    expect(computeBadge(passenger({ coursesPassager: 25, absences: 1 }))).toBe('verifie');
  });
});

describe('computeBadge — driver', () => {
  it('non_verifie without a validated vehicle', () => {
    expect(computeBadge(driver({ coursesChauffeur: 40 }, { hasValidatedVehicle: false }))).toBe('non_verifie');
  });

  it('nouveau below 5 rides, verifie from 5 rides', () => {
    expect(computeBadge(driver({ coursesChauffeur: 4 }))).toBe('nouveau');
    expect(computeBadge(driver({ coursesChauffeur: 5, noteMoyenne: 4.2 }))).toBe('verifie');
  });

  it('top with a rating of 4.7 or more over 30 rides and no confirmed report', () => {
    expect(computeBadge(driver({ coursesChauffeur: 30, noteMoyenne: 4.7 }))).toBe('top');
    expect(computeBadge(driver({ coursesChauffeur: 30, noteMoyenne: 4.6 }))).toBe('verifie');
    expect(computeBadge(driver({ coursesChauffeur: 30, noteMoyenne: 4.9 }, { confirmedReports: 1 }))).toBe('verifie');
  });

  it('a driver whose application is not validated is judged as a passenger', () => {
    expect(computeBadge(driver({ statutChauffeur: 'en_attente', coursesPassager: 0 }))).toBe('nouveau');
  });
});

describe('isUpgrade', () => {
  it('is true when reaching verifie or top', () => {
    expect(isUpgrade('nouveau', 'verifie')).toBe(true);
    expect(isUpgrade('verifie', 'top')).toBe(true);
    expect(isUpgrade('non_verifie', 'nouveau')).toBe(false);
    expect(isUpgrade('top', 'verifie')).toBe(false);
  });
});
