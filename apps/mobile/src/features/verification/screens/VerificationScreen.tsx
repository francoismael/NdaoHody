import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Vérification : permis et selfie · coquille R1, contenu en R6. */
export function VerificationScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Vérification : permis et selfie" session="R6">
      <Button label="Continuer : véhicule" onPress={() => router.push('/vehicle')} />
    </ShellScreen>
  );
}
