import type { ProfilPublic, Utilisateur } from '@contract';

import { SIGN_UP_MESSAGES } from '@/features/auth/rules';
import type { DriverPublicProfile } from '@/features/profile/types';
import { VERIFICATION_MESSAGES } from '@/features/verification/rules';

import { HttpError, findOr404, idParam, optionalString, requireUser, type MockRoute } from '../server';
import { toPublicProfile, userById } from '../views';

export const profileRoutes: MockRoute[] = [
  { method: 'GET', pattern: '/me', handler: (ctx): Utilisateur => requireUser(ctx) },
  {
    method: 'PATCH',
    pattern: '/me',
    handler: (ctx): Utilisateur => {
      const user = requireUser(ctx);
      const sexe = optionalString(ctx.body, 'sexe');
      // Same as the back: women-only trips rely on it, so it is set once.
      if (user.sexe && sexe && sexe !== user.sexe) throw new HttpError(403, VERIFICATION_MESSAGES.sexLocked);
      // Same as the back: the sex is required for everyone. GAP #7: the back also requires
      // nom on every PATCH (isProfileComplete); the demo keeps nom optional.
      const hasSexe = sexe === 'homme' || sexe === 'femme';
      if (!user.sexe && !hasSexe) throw new HttpError(400, SIGN_UP_MESSAGES.sexRequired);
      user.prenom = optionalString(ctx.body, 'prenom') ?? user.prenom;
      user.nom = optionalString(ctx.body, 'nom') ?? user.nom;
      if (hasSexe) user.sexe = sexe;
      return user;
    },
  },
  { method: 'GET', pattern: '/users/:id/public', handler: (ctx): ProfilPublic => toPublicProfile(userById(ctx, idParam(ctx))) },
  {
    method: 'GET',
    pattern: '/drivers/:id/public',
    // GAP #13: the public profile plus the rides count and the default validated vehicle.
    handler: (ctx): DriverPublicProfile => {
      const id = idParam(ctx);
      const driver = findOr404(ctx.db.utilisateurs, (u) => u.id === id && u.statutChauffeur !== 'aucun', 'Chauffeur');
      const vehicule = ctx.db.vehicules.find((v) => v.utilisateurId === id && v.parDefaut && v.statut === 'valide');
      return {
        ...toPublicProfile(driver),
        nombreCourses: driver.coursesChauffeur,
        vehicule: vehicule ? { type: vehicule.type, marque: vehicule.marque, modele: vehicule.modele, couleur: vehicule.couleur } : null,
      };
    },
  },
];
