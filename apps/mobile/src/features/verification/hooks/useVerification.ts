import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/features/profile';

import { MAX_VEHICLES, canAddVehicle, driverStep, type DriverStep } from '../rules';
import { keepPhoto } from '../services/photoStorage';
import { archiveVehicle, createVehicle, getMyApplication, getMyVehicles, updateVehicle, uploadDocument } from '../services/verificationService';
import type { CreateVehicleInput, UpdateVehicleInput, UploadDocumentInput } from '../types';

export const verificationKeys = {
  all: ['verification'] as const,
  application: () => [...verificationKeys.all, 'application'] as const,
  vehicles: () => [...verificationKeys.all, 'vehicles'] as const,
};

/** Driver status, licence number and latest documents (GET /me/documents). */
export const useMyApplication = () => useQuery({ queryKey: verificationKeys.application(), queryFn: getMyApplication });

export const useMyVehicles = () => useQuery({ queryKey: verificationKeys.vehicles(), queryFn: getMyVehicles });

/** The driver status may change (waiting for validation): refresh the profile too. */
function useVerificationMutation<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: verificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}

/** A photo just taken: moved out of the camera's temporary folder, then sent. */
export type SendDocumentInput = Omit<UploadDocumentInput, 'fichierUrl'> & { temporaryUri: string };

export const useSendDocument = () =>
  useVerificationMutation(async ({ temporaryUri, ...input }: SendDocumentInput) =>
    uploadDocument({ ...input, fichierUrl: await keepPhoto(temporaryUri, input.type) }),
  );

/** Vehicle photo: kept on the device, its URI goes with the vehicle form. */
export const useKeepPhoto = () =>
  useMutation({ mutationFn: ({ temporaryUri, name }: { temporaryUri: string; name: string }) => keepPhoto(temporaryUri, name) });

export const useCreateVehicle = () => useVerificationMutation((input: CreateVehicleInput) => createVehicle(input));

export const useUpdateVehicle = () =>
  useVerificationMutation(({ vehicleId, ...input }: UpdateVehicleInput & { vehicleId: number }) => updateVehicle(vehicleId, input));

export const useArchiveVehicle = () => useVerificationMutation((vehicleId: number) => archiveVehicle(vehicleId));

/** The vehicles that count (archived ones do not). */
export function useActiveVehicles() {
  const vehicles = useMyVehicles();
  return { ...vehicles, data: vehicles.data?.filter((v) => v.statut !== 'archive') };
}

/** How many vehicles the driver has, and whether he may add one (3 at most, the server refuses a 4th). */
export function useVehicleSlots(): { count: number; max: number; canAdd: boolean } | null {
  const vehicles = useActiveVehicles();
  if (!vehicles.data) return null;
  return { count: vehicles.data.length, max: MAX_VEHICLES, canAdd: canAddVehicle(vehicles.data) };
}

/** Where the driver stands, from the server's data. null while loading. */
export function useDriverStep(): { step: DriverStep | null; isError: boolean; error: Error | null; refetch: () => void } {
  const application = useMyApplication();
  const vehicles = useActiveVehicles();
  const step =
    application.data && vehicles.data
      ? driverStep(application.data.statutChauffeur, application.data.documents, vehicles.data.length > 0)
      : null;
  return {
    step,
    isError: application.isError || vehicles.isError,
    error: application.error ?? vehicles.error,
    refetch: () => {
      void application.refetch();
      void vehicles.refetch();
    },
  };
}
