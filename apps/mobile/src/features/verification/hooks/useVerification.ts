import type { TypeDocument } from '@contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/features/profile';

import { createVehicle, getMyDocuments, getMyVehicles, uploadDocument, type CreateVehicleInput } from '../services/verificationService';

export const verificationKeys = {
  all: ['verification'] as const,
  documents: () => [...verificationKeys.all, 'documents'] as const,
  vehicles: () => [...verificationKeys.all, 'vehicles'] as const,
};

export const useMyDocuments = () => useQuery({ queryKey: verificationKeys.documents(), queryFn: getMyDocuments });

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

export const useUploadDocument = () =>
  useVerificationMutation(({ type, fichierUrl }: { type: TypeDocument; fichierUrl: string }) => uploadDocument(type, fichierUrl));

export const useCreateVehicle = () => useVerificationMutation((input: CreateVehicleInput) => createVehicle(input));
