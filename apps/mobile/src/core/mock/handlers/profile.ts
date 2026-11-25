import type { ProfilPublic, Utilisateur } from '@contract';

import { VERIFICATION_MESSAGES } from '@/features/verification/rules';

import { HttpError, idParam, optionalString, requireUser, type MockRoute } from '../server';
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
      // GAP #7: the back also requires nom + prenom + sexe on every PATCH (isProfileComplete);
      // the demo keeps nom optional and asks the sex of drivers only.
      user.prenom = optionalString(ctx.body, 'prenom') ?? user.prenom;
      user.nom = optionalString(ctx.body, 'nom') ?? user.nom;
      if (sexe === 'homme' || sexe === 'femme') user.sexe = sexe;
      return user;
    },
  },
  { method: 'GET', pattern: '/users/:id/public', handler: (ctx): ProfilPublic => toPublicProfile(userById(ctx, idParam(ctx))) },
];
