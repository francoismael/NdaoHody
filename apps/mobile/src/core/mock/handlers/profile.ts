import type { ProfilPublic, Utilisateur } from '@contract';

import { idParam, optionalString, requireUser, type MockRoute } from '../server';
import { toPublicProfile, userById } from '../views';

export const profileRoutes: MockRoute[] = [
  { method: 'GET', pattern: '/me', handler: (ctx): Utilisateur => requireUser(ctx) },
  {
    method: 'PATCH',
    pattern: '/me',
    handler: (ctx): Utilisateur => {
      const user = requireUser(ctx);
      user.prenom = optionalString(ctx.body, 'prenom') ?? user.prenom;
      user.nom = optionalString(ctx.body, 'nom') ?? user.nom;
      const sexe = optionalString(ctx.body, 'sexe');
      if (sexe === 'homme' || sexe === 'femme') user.sexe = sexe;
      return user;
    },
  },
  { method: 'GET', pattern: '/users/:id/public', handler: (ctx): ProfilPublic => toPublicProfile(userById(ctx, idParam(ctx))) },
];
