/**
 * In-memory fakes of the ports and repositories, for unit tests (no database in CI).
 */
import { AccessToken, AccessTokenService } from '../../src/application/port/AccessTokenService';
import { Clock } from '../../src/application/port/Clock';
import { SecretHasher } from '../../src/application/port/SecretHasher';
import { RandomGenerator } from '../../src/application/port/RandomGenerator';
import { SmsSender } from '../../src/application/port/SmsSender';
import { UnitOfWork } from '../../src/application/port/UnitOfWork';
import type { NewOtpCode, OtpCode } from '../../src/domain/entity/OtpCode';
import type { User, UserChanges } from '../../src/domain/entity/User';
import type { NewUserSession, UserSession } from '../../src/domain/entity/UserSession';
import { OtpCodeRepository } from '../../src/domain/repository/OtpCodeRepository';
import { SettingRepository } from '../../src/domain/repository/SettingRepository';
import { UserSessionRepository } from '../../src/domain/repository/UserSessionRepository';
import { UserRepository } from '../../src/domain/repository/UserRepository';

export const NOW = new Date('2026-11-24T07:00:00.000Z');

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    telephone: '+261341234567',
    nom: 'Rakoto',
    prenom: 'Hery',
    sexe: 'homme',
    photoUrl: null,
    modeActuel: 'passager',
    statutChauffeur: 'aucun',
    statut: 'actif',
    badge: 'nouveau',
    noteMoyenne: null,
    nombreNotes: 0,
    coursesPassager: 0,
    coursesChauffeur: 0,
    absences: 0,
    telephoneVerifie: true,
    numeroPermis: null,
    dateCreation: NOW.toISOString(),
    ...overrides,
  };
}

export class FixedClock extends Clock {
  constructor(private current: Date = NOW) {
    super();
  }

  now(): Date {
    return new Date(this.current);
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

/** Readable "hash" so tests can check what was stored. */
export class PlainHasher extends SecretHasher {
  hash(secret: string): string {
    return `hash:${secret}`;
  }

  matches(secret: string, hash: string): boolean {
    return this.hash(secret) === hash;
  }
}

export class PredictableRandom extends RandomGenerator {
  private tokens = 0;

  constructor(private readonly code = '123456') {
    super();
  }

  otpCode(): string {
    return this.code;
  }

  token(): string {
    this.tokens += 1;
    return `refresh-${this.tokens}`;
  }

  password(): string {
    return 'temporary-password';
  }
}

export class FakeAccessTokens extends AccessTokenService {
  issue(userId: number, expiresInSeconds: number): AccessToken {
    return { token: `access-${userId}`, expiresInSeconds };
  }

  verify(token: string): number | null {
    const match = /^access-(\d+)$/.exec(token);
    return match ? Number(match[1]) : null;
  }
}

export class RecordingSms extends SmsSender {
  readonly sent: { telephone: string; message: string }[] = [];

  async send(telephone: string, message: string): Promise<void> {
    this.sent.push({ telephone, message });
  }
}

/** Runs the work directly (no rollback in memory). */
export class DirectUnitOfWork extends UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}

export class InMemorySettings extends SettingRepository {
  constructor(private readonly values: Record<string, number> = {}) {
    super();
  }

  async findNumber(cle: string): Promise<number | null> {
    return this.values[cle] ?? null;
  }
}

export class InMemoryUsers extends UserRepository {
  readonly rows: User[] = [];
  ridesInProgress = new Set<number>();

  constructor(...users: User[]) {
    super();
    this.rows.push(...users);
  }

  async findById(id: number): Promise<User | null> {
    return this.rows.find((user) => user.id === id) ?? null;
  }

  async findByPhone(telephone: string): Promise<User | null> {
    return this.rows.find((user) => user.telephone === telephone) ?? null;
  }

  async findByLicenseNumber(numeroPermis: string): Promise<User | null> {
    return this.rows.find((user) => user.numeroPermis === numeroPermis) ?? null;
  }

  async listByDriverStatus(statutChauffeur: User['statutChauffeur']): Promise<User[]> {
    return this.rows.filter((user) => user.statutChauffeur === statutChauffeur && user.statut !== 'supprime');
  }

  async createWithVerifiedPhone(telephone: string, dateCreation: Date): Promise<User> {
    const user = makeUser({
      id: this.rows.length + 1,
      telephone,
      nom: null,
      prenom: null,
      sexe: null,
      dateCreation: dateCreation.toISOString(),
    });
    this.rows.push(user);
    return user;
  }

  async update(id: number, changes: UserChanges): Promise<User> {
    const index = this.rows.findIndex((user) => user.id === id);
    const updated = { ...this.rows[index], ...changes } as User;
    this.rows[index] = updated;
    return updated;
  }

  /** Ratings received, to compute the average (filled by InMemoryReviews). */
  readonly ratings = new Map<number, number[]>();

  async countRide(id: number, as: 'passager' | 'chauffeur'): Promise<void> {
    const user = this.rows.find((row) => row.id === id);
    if (user) {
      if (as === 'passager') user.coursesPassager += 1;
      else user.coursesChauffeur += 1;
    }
  }

  async countAbsence(id: number): Promise<void> {
    const user = this.rows.find((row) => row.id === id);
    if (user) user.absences += 1;
  }

  async refreshRating(id: number): Promise<void> {
    const user = this.rows.find((row) => row.id === id);
    const notes = this.ratings.get(id) ?? [];
    if (user) {
      user.nombreNotes = notes.length;
      user.noteMoyenne = notes.length ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10 : null;
    }
  }

  async hasRideInProgress(id: number): Promise<boolean> {
    return this.ridesInProgress.has(id);
  }
}

export class InMemoryOtpCodes extends OtpCodeRepository {
  readonly rows: OtpCode[] = [];

  async findLatest(telephone: string): Promise<OtpCode | null> {
    const codes = this.rows.filter((code) => code.telephone === telephone);
    return codes.at(-1) ?? null;
  }

  async countCreatedSince(telephone: string, since: Date): Promise<number> {
    return this.rows.filter((code) => code.telephone === telephone && code.dateCreation >= since).length;
  }

  async create(code: NewOtpCode): Promise<OtpCode> {
    const row: OtpCode = { ...code, id: this.rows.length + 1, essais: 0, dateUtilisation: null };
    this.rows.push(row);
    return row;
  }

  async recordFailedAttempt(id: number): Promise<void> {
    this.find(id).essais += 1;
  }

  async markUsed(id: number, at: Date): Promise<void> {
    this.find(id).dateUtilisation = at;
  }

  private find(id: number): OtpCode {
    const code = this.rows.find((row) => row.id === id);
    if (!code) {
      throw new Error(`No OTP code ${id}`);
    }
    return code;
  }
}

export class InMemorySessions extends UserSessionRepository {
  readonly rows: UserSession[] = [];

  async create(session: NewUserSession): Promise<UserSession> {
    const row: UserSession = { ...session, id: this.rows.length + 1, dateRevocation: null };
    this.rows.push(row);
    return row;
  }

  async findByTokenHash(jetonHash: string): Promise<UserSession | null> {
    return this.rows.find((row) => row.jetonHash === jetonHash) ?? null;
  }

  async revoke(id: number, at: Date): Promise<void> {
    const session = this.rows.find((row) => row.id === id);
    if (session && !session.dateRevocation) {
      session.dateRevocation = at;
    }
  }

  async revokeAllForUser(utilisateurId: number, at: Date): Promise<void> {
    for (const session of this.rows) {
      if (session.utilisateurId === utilisateurId && !session.dateRevocation) {
        session.dateRevocation = at;
      }
    }
  }
}
