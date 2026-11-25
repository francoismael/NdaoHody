import type { DocumentChauffeur, TypeDocument, Vehicule } from '@contract';

import { request } from '@/core/mock';

export type CreateVehicleInput = Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation' | 'places' | 'photoUrl'>;

export const getMyDocuments = () => request<DocumentChauffeur[]>('GET', '/me/documents');

/** `fichierUrl`: local photo URI today, uploaded file URL tomorrow. */
export const uploadDocument = (type: TypeDocument, fichierUrl: string) =>
  request<DocumentChauffeur>('POST', '/me/documents', { type, fichierUrl });

export const getMyVehicles = () => request<Vehicule[]>('GET', '/me/vehicles');

export const createVehicle = (input: CreateVehicleInput) => request<Vehicule>('POST', '/me/vehicles', input);
