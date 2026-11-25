import type { Vehicule } from '@contract';

import { request } from '@/core/mock';

import type { AddVehicleResult, CreateVehicleInput, DriverApplication, UploadDocumentInput } from '../types';

export const getMyApplication = () => request<DriverApplication>('GET', '/me/documents');

export const uploadDocument = (input: UploadDocumentInput) => request<DriverApplication>('POST', '/me/documents', input);

export const getMyVehicles = () => request<Vehicule[]>('GET', '/me/vehicles');

export const createVehicle = (input: CreateVehicleInput) => request<AddVehicleResult>('POST', '/me/vehicles', input);
