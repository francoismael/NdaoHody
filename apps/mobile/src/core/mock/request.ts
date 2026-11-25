import { ApiError, currentTime, delay } from '@/shared/utils';

import { sessionStore } from '../session/sessionStore';
import { autoReply } from './autoReply';
import { getDb, saveDb } from './db';
import { refreshDerived } from './derived';
import { mockRoutes } from './handlers';
import { HttpError, matchPattern, type HttpMethod, type MockRoute } from './server';
import { iso } from './time';
import type { MockDb } from './types';

export const API_PREFIX = '/api/v1';

/** Realistic mobile latency, so loading states are seen (and tested) from day one. */
const LATENCY_MS: [number, number] = [300, 900];

let failureRate = 0;

/** Demo panel (R3): share of requests that fail with a 503, from 0 to 1. */
export function setMockFailureRate(rate: number): void {
  failureRate = Math.min(Math.max(rate, 0), 1);
}

function splitQuery(path: string): { pathname: string; query: Record<string, string> } {
  const [pathname, search = ''] = path.split('?');
  const query: Record<string, string> = {};
  search
    .split('&')
    .filter(Boolean)
    .forEach((pair) => {
      const [key, value = ''] = pair.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(value);
    });
  return { pathname, query };
}

/**
 * Runs one route on the database, as `userId`. Synchronous and without latency:
 * used by `request` (the app) and by the demo engine (the "other person").
 * Throws an ApiError, like the real server's error body.
 */
export function dispatch(db: MockDb, now: Date, userId: number | null, method: HttpMethod, path: string, body?: unknown): unknown {
  const fullPath = API_PREFIX + path;
  const fail = (status: number, message: string): ApiError =>
    new ApiError({ status, message, timestamp: iso(now), path: fullPath });

  const { pathname, query } = splitQuery(path);
  let match: { route: MockRoute; params: Record<string, string> } | null = null;
  for (const candidate of mockRoutes) {
    const params = candidate.method === method ? matchPattern(candidate.pattern, pathname) : null;
    if (params) {
      match = { route: candidate, params };
      break;
    }
  }
  if (!match) throw fail(404, `Route inconnue : ${method} ${fullPath}`);
  const { route, params } = match;

  try {
    refreshDerived(db, now);
    const result = route.handler({ db, now, userId, params, query, body });
    if (method !== 'GET') refreshDerived(db, now);
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw fail(error.status, error.message);
    throw error;
  }
}

/** Same boundary as `await response.json()`: the caller states the type it expects. */
export const copyOut = <T>(result: unknown): T => JSON.parse(JSON.stringify(result ?? null)) as T;

/**
 * The simulated API. Same signature the real HTTP client will have: services
 * call `request<T>('POST', '/reservations', body)` and never know the data is fake.
 * The result is a copy: nobody outside the server can change its data by mistake.
 */
export async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const [min, max] = LATENCY_MS;
  const [db] = await Promise.all([getDb(), delay(min + Math.random() * (max - min))]);
  const now = currentTime();

  if (Math.random() < failureRate) {
    throw new ApiError({ status: 503, message: 'Le service est momentanément indisponible. Réessaie.', timestamp: iso(now), path: API_PREFIX + path });
  }

  const drivesBefore = JSON.stringify(db.drives);
  const simulated = autoReply(db, now, dispatch);
  const result = dispatch(db, now, sessionStore.getState().userId, method, path, body);
  // A car that stopped or restarted is saved even on a GET: after a restart it resumes from the right place.
  if (method !== 'GET' || simulated || JSON.stringify(db.drives) !== drivesBefore) await saveDb();
  return copyOut<T>(result);
}
