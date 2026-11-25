import { readJson, writeJson } from '@/shared/storage';
import { isRecord } from '@/shared/utils';

import { fetchMissingRoutes, loadRouteCache } from './routeCache';
import { createSeed } from './seed';
import { DB_VERSION, type MockDb } from './types';

const DB_KEY = 'ndaohody:mock-db';

let current: MockDb | null = null;
let loading: Promise<MockDb> | null = null;

/** We wrote this value ourselves: a version check is enough to trust its shape. */
const isMockDb = (value: unknown): value is MockDb =>
  isRecord(value) && value.version === DB_VERSION && Array.isArray(value.utilisateurs);

/** New dataset relative to now. Asks Mapbox first for roads not yet saved (silent if offline). */
async function reseed(): Promise<MockDb> {
  await fetchMissingRoutes();
  const db = createSeed(new Date());
  current = db;
  await writeJson(DB_KEY, db);
  return db;
}

async function load(): Promise<MockDb> {
  await loadRouteCache();
  const stored = await readJson(DB_KEY);
  if (isMockDb(stored)) {
    current = stored;
    return stored;
  }
  return reseed();
}

/** The database, loaded once from the device (or seeded on first launch). */
export function getDb(): Promise<MockDb> {
  if (current) return Promise.resolve(current);
  loading ??= load();
  return loading;
}

/** Saves after a write: the simulated server's data survives a full app close. */
export async function saveDb(): Promise<void> {
  if (current) await writeJson(DB_KEY, current);
}

/** Throws every change away and seeds again (demo reset). */
export async function resetDb(): Promise<void> {
  loading = reseed();
  await loading;
}
