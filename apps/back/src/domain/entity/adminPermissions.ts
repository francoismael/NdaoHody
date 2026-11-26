import type { RoleAdmin } from '@contract';
import type { ActionAdmin } from '@contract/back-office';

/** Watching the business without touching it: aggregated figures and settings only. */
const INVESTOR_ACTIONS: readonly ActionAdmin[] = ['tableau_de_bord.voir', 'stats.voir', 'stats.exporter', 'reglages.voir'];

const ADMIN_ACTIONS: readonly ActionAdmin[] = [
  ...INVESTOR_ACTIONS,
  'chauffeurs.dossiers.voir',
  'chauffeurs.dossiers.decider',
  'vehicules.voir',
  'vehicules.decider',
  'chauffeurs.voir',
  'chauffeurs.suspendre',
  'utilisateurs.voir',
  'utilisateurs.suspendre',
  'recherche',
  'trajets.voir',
  'trajets.annuler',
  'signalements.voir',
  'signalements.traiter',
];

const SUPER_ADMIN_ACTIONS: readonly ActionAdmin[] = [
  ...ADMIN_ACTIONS,
  'comptes.voir',
  'comptes.creer',
  'comptes.activer',
  'comptes.reinitialiser_mot_de_passe',
  'journal.voir',
  'reglages.modifier',
];

/**
 * What each back-office role may do. The single source of truth:
 * the guard checks it on every route, and the back-office receives it to show menus and buttons.
 */
export const ADMIN_PERMISSIONS: Readonly<Record<RoleAdmin, readonly ActionAdmin[]>> = {
  super_admin: SUPER_ADMIN_ACTIONS,
  admin: ADMIN_ACTIONS,
  investisseur: INVESTOR_ACTIONS,
};

export function permissionsOf(role: RoleAdmin): ActionAdmin[] {
  return [...ADMIN_PERMISSIONS[role]];
}

export function canDo(role: RoleAdmin, action: ActionAdmin): boolean {
  return ADMIN_PERMISSIONS[role].includes(action);
}
