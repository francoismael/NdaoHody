import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/features/profile';

import { driverStep, type DriverStep } from '../rules';
import { keepPhoto } from '../services/photoStorage';
import { createVehicle, getMyApplication, getMyVehicles, uploadDocument } from '../services/verificationService';
import type { CreateVehicleInput, UploadDocumentInput } from '../types';

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

/** The vehicles that count (archived ones do not). */
export function useActiveVehicles() {
  const vehicles = useMyVehicles();
  return { ...vehicles, data: vehicles.data?.filter((v) => v.statut !== 'archive') };
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
