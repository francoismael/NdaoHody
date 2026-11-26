import type { Lieu, Utilisateur } from '@contract';

import { isRecord } from '@/shared/utils';

import type { MockDb } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RequestContext {
  db: MockDb;
  now: Date;
  /** Signed-in user, as the real server reads it from the token. */
  userId: number | null;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}

export interface MockRoute {
  method: HttpMethod;
  /** Path after /api/v1, with :params, e.g. "/reservations/:id/accept". */
  pattern: string;
  handler: (ctx: RequestContext) => unknown;
}

/** Thrown by a handler; becomes an ApiError with the same status. Messages are shown to the user. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const expected = pattern.split('/');
  const actual = path.split('/');
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
    else if (expected[i] !== actual[i]) return null;
  }
  return params;
}

export function requireUser(ctx: RequestContext): Utilisateur {
  const user = ctx.db.utilisateurs.find((u) => u.id === ctx.userId);
  if (!user) throw new HttpError(401, 'Ta session a expiré. Reconnecte-toi.');
  return user;
}

export function findOr404<T>(items: T[], predicate: (item: T) => boolean, what: string): T {
  const item = items.find(predicate);
  if (item === undefined) throw new HttpError(404, `${what} introuvable.`);
  return item;
}

export const idParam = (ctx: RequestContext, name = 'id'): number => {
  const value = Number(ctx.params[name]);
  if (!Number.isInteger(value)) throw new HttpError(400, `${name} invalide.`);
  return value;
};

/* Body readers: the server validates everything it receives (ValidationPipe on the real API). */

const field = (body: unknown, key: string): unknown => (isRecord(body) ? body[key] : undefined);

export function requireString(body: unknown, key: string): string {
  const value = field(body, key);
  if (typeof value !== 'string' || value.trim() === '') throw new HttpError(400, `${key} est obligatoire.`);
  return value.trim();
}

export function optionalString(body: unknown, key: string): string | null {
  const value = field(body, key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function requireNumber(body: unknown, key: string): number {
  const value = field(body, key);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new HttpError(400, `${key} doit être un nombre.`);
  return value;
}

export function optionalNumber(body: unknown, key: string): number | null {
  const value = field(body, key);
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new HttpError(400, `${key} doit être un nombre.`);
  return value;
}

export function optionalBoolean(body: unknown, key: string): boolean {
  return field(body, key) === true;
}

export function requireOneOf<T extends string>(body: unknown, key: string, allowed: readonly T[]): T {
  const value = field(body, key);
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw new HttpError(400, `${key} doit valoir : ${allowed.join(', ')}.`);
  return match;
}

export function requireLieu(body: unknown, key: string): Lieu {
  const value = field(body, key);
  return {
    libelle: requireString(value, 'libelle'),
    latitude: requireNumber(value, 'latitude'),
    longitude: requireNumber(value, 'longitude'),
  };
}
