import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../domain/exception/DomainException';

const BASE_URL = 'https://api.mapbox.com';
const TIMEOUT_MS = 8000;
/** A usage line is written in the logs every this many calls of a service. */
const USAGE_LOG_EVERY = 100;

export const MAP_UNAVAILABLE_MESSAGE = 'La carte est momentanément indisponible. Réessaie dans un instant.';

/** Mapbox services, counted apart (each has its own free monthly quota). */
export type MapboxService = 'directions' | 'search' | 'geocoding';

export interface MapboxResponse {
  status: number;
  body: unknown;
}

/**
 * The only place that calls Mapbox: adds the key, stops after 8 s, turns outages into a clean 503
 * and counts the calls of the day per service (quota follow-up in the logs).
 * Answers 2xx and 4xx (other than 401, 403, 429) are handed back: each adapter reads its own errors.
 */
@Injectable()
export class MapboxClient {
  private readonly logger = new Logger('Mapbox');
  private readonly token: string;
  private usageDay = '';
  private readonly usage = new Map<MapboxService, number>();

  constructor(config: ConfigService) {
    this.token = config.getOrThrow<string>('MAPBOX_ACCESS_TOKEN');
  }

  async get(service: MapboxService, path: string, params: Record<string, string | undefined>): Promise<MapboxResponse> {
    this.count(service);
    const query = new URLSearchParams({ access_token: this.token });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        query.set(key, value);
      }
    }

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}?${query.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      this.logger.warn(`${service}: no answer (${error instanceof Error ? error.message : String(error)})`);
      throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
    }

    if (response.status === 401 || response.status === 403) {
      this.logger.error(`${service}: Mapbox refused MAPBOX_ACCESS_TOKEN (HTTP ${response.status}). Check apps/back/.env.`);
      throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
    }
    if (response.status === 429) {
      this.logger.warn(`${service}: Mapbox rate limit or quota reached (HTTP 429).`);
      throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
    }
    if (response.status >= 500) {
      this.logger.warn(`${service}: Mapbox error (HTTP ${response.status}).`);
      throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
    }

    try {
      return { status: response.status, body: (await response.json()) as unknown };
    } catch {
      throw new DomainException('unavailable', MAP_UNAVAILABLE_MESSAGE);
    }
  }

  /** Calls of the current day, per service. */
  usageToday(): Record<MapboxService, number> {
    this.rollDay();
    return {
      directions: this.usage.get('directions') ?? 0,
      search: this.usage.get('search') ?? 0,
      geocoding: this.usage.get('geocoding') ?? 0,
    };
  }

  private count(service: MapboxService): void {
    this.rollDay();
    const calls = (this.usage.get(service) ?? 0) + 1;
    this.usage.set(service, calls);
    if (calls % USAGE_LOG_EVERY === 0) {
      const today = this.usageToday();
      this.logger.log(
        `Usage on ${this.usageDay}: directions=${today.directions}, search=${today.search}, geocoding=${today.geocoding}`,
      );
    }
  }

  private rollDay(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.usageDay) {
      this.usageDay = today;
      this.usage.clear();
    }
  }
}
