import type { Vehicule } from '@contract';

import { request } from '@/core/mock';

import type { AddVehicleResult, CreateVehicleInput, DriverApplication, MyVehicle, UpdateVehicleInput, UploadDocumentInput } from '../types';

export const getMyApplication = () => request<DriverApplication>('GET', '/me/documents');

export const uploadDocument = (input: UploadDocumentInput) => request<DriverApplication>('POST', '/me/documents', input);

export const getMyVehicles = () => request<MyVehicle[]>('GET', '/me/vehicles');

export const createVehicle = (input: CreateVehicleInput) => request<AddVehicleResult>('POST', '/me/vehicles', input);

export const updateVehicle = (vehicleId: number, input: UpdateVehicleInput) => request<Vehicule>('PATCH', `/me/vehicles/${vehicleId}`, input);

/** Archived by the server (never deleted: the plate stays tied to this driver). */
export const archiveVehicle = (vehicleId: number) => request<null>('DELETE', `/me/vehicles/${vehicleId}`);
