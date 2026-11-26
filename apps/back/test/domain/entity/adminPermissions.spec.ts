import { ADMIN_PERMISSIONS, canDo, permissionsOf } from '../../../src/domain/entity/adminPermissions';

describe('admin permissions', () => {
  it('lets the investisseur only follow the figures and read the settings', () => {
    expect(permissionsOf('investisseur').sort()).toEqual(
      ['reglages.voir', 'stats.exporter', 'stats.voir', 'tableau_de_bord.voir'].sort(),
    );
  });

  it('keeps the investisseur away from personal data and decisions', () => {
    for (const action of ['chauffeurs.dossiers.voir', 'vehicules.voir', 'utilisateurs.voir', 'comptes.voir'] as const) {
      expect(canDo('investisseur', action)).toBe(false);
    }
  });

  it('lets the admin decide on drivers but not manage accounts or settings', () => {
    expect(canDo('admin', 'chauffeurs.dossiers.decider')).toBe(true);
    expect(canDo('admin', 'comptes.creer')).toBe(false);
    expect(canDo('admin', 'reglages.modifier')).toBe(false);
  });

  it('gives the super admin every action of the other roles', () => {
    const superAdmin = ADMIN_PERMISSIONS.super_admin;
    for (const action of [...ADMIN_PERMISSIONS.admin, ...ADMIN_PERMISSIONS.investisseur]) {
      expect(superAdmin).toContain(action);
    }
  });
});
