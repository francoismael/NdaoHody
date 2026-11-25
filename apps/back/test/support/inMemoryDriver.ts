/**
 * In-memory fakes for drivers, vehicles and back-office accounts (unit tests, no database).
 */
import { FileStorage } from '../../src/application/port/FileStorage';
import { ImageProcessor, ProcessedImage } from '../../src/application/port/ImageProcessor';
import { PasswordHasher } from '../../src/application/port/PasswordHasher';
import { PrivateFile, PrivateFileStorage } from '../../src/application/port/PrivateFileStorage';
import type { UploadedImage } from '../../src/application/helper/uploadedImage';
import type { AdminAccount, AdminAccountChanges, NewAdminAccount } from '../../src/domain/entity/AdminAccount';
import type { DriverDocument, NewDriverDocument } from '../../src/domain/entity/DriverDocument';
import type { NewVehicle, Vehicle, VehicleChanges } from '../../src/domain/entity/Vehicle';
import { AdminAccountRepository } from '../../src/domain/repository/AdminAccountRepository';
import { DriverDocumentRepository } from '../../src/domain/repository/DriverDocumentRepository';
import { VehicleRepository } from '../../src/domain/repository/VehicleRepository';
import { NOW } from './inMemory';

export const IMAGE: UploadedImage = { content: Buffer.from('image'), mimeType: 'image/jpeg' };

export class InMemoryDriverDocuments extends DriverDocumentRepository {
  readonly rows: DriverDocument[] = [];

  async listByUser(utilisateurId: number): Promise<DriverDocument[]> {
    return this.rows.filter((document) => document.utilisateurId === utilisateurId);
  }

  async create(document: NewDriverDocument): Promise<DriverDocument> {
    const row: DriverDocument = {
      ...document,
      id: this.rows.length + 1,
      statut: 'en_attente',
      motifRefus: null,
      verifiePar: null,
    };
    this.rows.push(row);
    return row;
  }

  async review(ids: readonly number[], decision: Pick<DriverDocument, 'statut' | 'motifRefus' | 'verifiePar'>): Promise<void> {
    for (const row of this.rows) {
      if (ids.includes(row.id)) {
        Object.assign(row, decision);
      }
    }
  }
}

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 1,
    utilisateurId: 1,
    type: 'voiture',
    marque: 'Toyota',
    modele: 'Corolla',
    couleur: 'Gris',
    immatriculation: '1234 TBA',
    places: 4,
    photoUrl: 'http://localhost:3000/uploads/vehicules/a.jpg',
    parDefaut: true,
    statut: 'valide',
    motifRefus: null,
    ...overrides,
  };
}

export class InMemoryVehicles extends VehicleRepository {
  readonly rows: Vehicle[] = [];

  constructor(...vehicles: Vehicle[]) {
    super();
    this.rows.push(...vehicles);
  }

  async findById(id: number): Promise<Vehicle | null> {
    return this.rows.find((vehicle) => vehicle.id === id) ?? null;
  }

  async findByPlate(immatriculation: string): Promise<Vehicle | null> {
    return this.rows.find((vehicle) => vehicle.immatriculation === immatriculation) ?? null;
  }

  async listByOwner(utilisateurId: number): Promise<Vehicle[]> {
    return this.rows.filter((vehicle) => vehicle.utilisateurId === utilisateurId && vehicle.statut !== 'archive');
  }

  async listByStatus(statut: Vehicle['statut']): Promise<Vehicle[]> {
    return this.rows.filter((vehicle) => vehicle.statut === statut);
  }

  async create(vehicle: NewVehicle): Promise<Vehicle> {
    const row: Vehicle = { ...vehicle, id: this.rows.length + 1, statut: 'en_attente', motifRefus: null };
    this.rows.push(row);
    return row;
  }

  async update(id: number, changes: VehicleChanges): Promise<Vehicle> {
    const index = this.rows.findIndex((vehicle) => vehicle.id === id);
    const updated = { ...this.rows[index], ...changes } as Vehicle;
    this.rows[index] = updated;
    return updated;
  }

  async clearDefault(utilisateurId: number): Promise<void> {
    for (const vehicle of this.rows) {
      if (vehicle.utilisateurId === utilisateurId) {
        vehicle.parDefaut = false;
      }
    }
  }

  async isUsedByActiveTrip(): Promise<boolean> {
    return false;
  }
}

export function makeAdmin(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    id: 1,
    nomComplet: 'Super Admin',
    email: 'super@ndaohody.test',
    role: 'super_admin',
    actif: true,
    creePar: null,
    derniereConnexion: null,
    dateCreation: NOW.toISOString(),
    motDePasse: 'hashed:secret',
    echecsConnexion: 0,
    bloqueJusqua: null,
    ...overrides,
  };
}

export class InMemoryAdminAccounts extends AdminAccountRepository {
  readonly rows: AdminAccount[] = [];

  constructor(...accounts: AdminAccount[]) {
    super();
    this.rows.push(...accounts);
  }

  async findById(id: number): Promise<AdminAccount | null> {
    return this.rows.find((account) => account.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<AdminAccount | null> {
    return this.rows.find((account) => account.email === email) ?? null;
  }

  async list(): Promise<AdminAccount[]> {
    return [...this.rows];
  }

  async create(account: NewAdminAccount, dateCreation: Date): Promise<AdminAccount> {
    const row = makeAdmin({ ...account, id: this.rows.length + 1, dateCreation: dateCreation.toISOString() });
    this.rows.push(row);
    return row;
  }

  async update(id: number, changes: AdminAccountChanges): Promise<AdminAccount> {
    const index = this.rows.findIndex((account) => account.id === id);
    const { derniereConnexion, ...rest } = changes;
    const updated: AdminAccount = {
      ...(this.rows[index] as AdminAccount),
      ...rest,
      ...(derniereConnexion ? { derniereConnexion: derniereConnexion.toISOString() } : {}),
    };
    this.rows[index] = updated;
    return updated;
  }
}

/** "hashed:<password>" so tests stay fast (no bcrypt). */
export class PlainPasswordHasher extends PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed:${password}`;
  }
}

export class PassThroughImages extends ImageProcessor {
  async toProfilePhoto(content: Buffer): Promise<ProcessedImage> {
    return { content, extension: 'jpg' };
  }

  async toDocumentImage(content: Buffer): Promise<ProcessedImage> {
    return { content, extension: 'jpg' };
  }
}

export class MemoryFileStorage extends FileStorage {
  readonly saved: string[] = [];
  readonly removed: string[] = [];

  async save(folder: string): Promise<string> {
    const url = `http://localhost:3000/uploads/${folder}/${this.saved.length + 1}.jpg`;
    this.saved.push(url);
    return url;
  }

  async remove(url: string): Promise<void> {
    this.removed.push(url);
  }
}

export class MemoryPrivateFiles extends PrivateFileStorage {
  private files = 0;

  async save(folder: string): Promise<string> {
    this.files += 1;
    return `${folder}/${this.files}.jpg`;
  }

  temporaryUrl(key: string): string {
    return `http://localhost:3000/api/files?key=${key}`;
  }

  async readTemporary(): Promise<PrivateFile | null> {
    return null;
  }
}
