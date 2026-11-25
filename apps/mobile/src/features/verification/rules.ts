import type { DocumentChauffeur, StatutChauffeur, TypeDocument, TypeVehicule } from '@contract';

/**
 * Pure driver-application rules, shared by the screens and the simulated server.
 * Same rules and messages as the back (DriverIdentity.ts, Vehicle.ts, DriverDocument.ts,
 * AddVehicleUseCase, SubmitDriverDocumentUseCase). Type-only imports: core may import this file.
 */

export const DOCUMENT_TYPES: readonly TypeDocument[] = ['permis_recto', 'permis_verso', 'selfie'];

export const MAX_CAR_SEATS = 8;

/** How a document is named on screen (app and demo panel). */
export const DOCUMENT_LABELS: Record<TypeDocument, string> = {
  permis_recto: 'Permis recto',
  permis_verso: 'Permis verso',
  selfie: 'Selfie',
};

/** Messages of the back, shown as they are. */
export const VERIFICATION_MESSAGES = {
  imageRequired: 'Envoie une photo au format JPEG, PNG ou WebP (5 Mo maximum).',
  licenseInvalid: 'Indique le numéro de ton permis (5 à 20 lettres ou chiffres).',
  licenseFrontFirst: "Envoie d'abord le recto de ton permis avec son numéro.",
  licenseTaken: 'Ce permis est déjà lié à un autre compte Ndaohody. Contacte le support si c’est bien le tien.',
  plateInvalid: 'Immatriculation invalide. Exemple : 1234 TBA.',
  plateTaken: 'Ce véhicule est déjà enregistré sur un autre compte Ndaohody. Contacte le support si c’est bien le tien.',
  plateAlreadyMine: 'Ce véhicule est déjà dans ta liste.',
  seatsInvalid: 'Une moto a 1 place ; une voiture de 1 à 8 places.',
  /** Not a message of the back (its validator answers in English): written for the app. */
  colorRequired: 'Indique la couleur du véhicule.',
  alreadyValidated: 'Ton dossier chauffeur est déjà validé.',
  suspended: 'Ton activité de chauffeur est suspendue. Contacte le support Ndaohody.',
  sexLocked: 'Le sexe ne peut plus être modifié. Contacte le support Ndaohody.',
} as const;

const LICENSE_NUMBER = /^[A-Z0-9]{5,20}$/;
/** Malagasy plate: 4 digits then 2 or 3 letters, e.g. "1234 TBA". */
const PLATE_NUMBER = /^(\d{4})([A-Z]{2,3})$/;
const NOT_ALPHANUMERIC = /[^A-Z0-9]/g;

/** "ab-123 456" -> "AB123456". null when it cannot be a licence number. */
export function normalizeLicenseNumber(input: string): string | null {
  const value = input.toUpperCase().replace(NOT_ALPHANUMERIC, '');
  return LICENSE_NUMBER.test(value) ? value : null;
}

/** "1234tba", "1234-TBA" -> "1234 TBA". null when it is not a Malagasy plate. */
export function normalizePlateNumber(input: string): string | null {
  const match = PLATE_NUMBER.exec(input.toUpperCase().replace(NOT_ALPHANUMERIC, ''));
  return match ? `${match[1]} ${match[2]}` : null;
}

/** A motorbike carries 1 passenger; a car 1 to 8. */
export function isValidSeatCount(type: TypeVehicule, places: number): boolean {
  if (!Number.isInteger(places) || places < 1) return false;
  return type === 'moto' ? places === 1 : places <= MAX_CAR_SEATS;
}

/** Latest document of each type, in the order permis_recto, permis_verso, selfie. */
export function latestDocuments<T extends Pick<DocumentChauffeur, 'id' | 'type' | 'dateEnvoi'>>(documents: readonly T[]): T[] {
  const newestFirst = [...documents].sort((a, b) => b.dateEnvoi.localeCompare(a.dateEnvoi) || b.id - a.id);
  return DOCUMENT_TYPES.flatMap((type) => {
    const latest = newestFirst.find((document) => document.type === type);
    return latest ? [latest] : [];
  });
}

/** Documents still to send: never sent, or refused by an admin. */
export function documentsToSend(documents: readonly Pick<DocumentChauffeur, 'id' | 'type' | 'dateEnvoi' | 'statut'>[]): TypeDocument[] {
  const latest = latestDocuments(documents);
  return DOCUMENT_TYPES.filter((type) => {
    const document = latest.find((d) => d.type === type);
    return !document || document.statut === 'refuse';
  });
}

/** Where the driver stands. The screens follow it: the state decides, navigation obeys. */
export type DriverStep = 'documents' | 'vehicle' | 'pending' | 'refused' | 'validated' | 'suspended';

export function driverStep(
  statutChauffeur: StatutChauffeur,
  documents: readonly Pick<DocumentChauffeur, 'id' | 'type' | 'dateEnvoi' | 'statut'>[],
  hasVehicle: boolean,
): DriverStep {
  if (statutChauffeur === 'suspendu') return 'suspended';
  if (statutChauffeur === 'valide') return 'validated';
  if (statutChauffeur === 'refuse') return 'refused';
  if (documentsToSend(documents).length > 0) return 'documents';
  return hasVehicle ? 'pending' : 'vehicle';
}
