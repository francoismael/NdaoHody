/**
 * Sign-up rules, shared by the screens and the simulated server.
 * Type-free and import-free: core may import this file.
 */

/** A first name of at least 2 letters (the last name is optional: GAP #7). */
export const FIRST_NAME_MIN = 2;

export const SIGN_UP_MESSAGES = {
  firstNameMissing: 'Écris ton prénom : il sera vu par les chauffeurs.',
  firstNameShort: 'Ton prénom doit avoir au moins 2 lettres.',
  sexRequired: 'Choisis Homme ou Femme.',
} as const;
