import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Véhicule et sexe · coquille R1, contenu en R7. */
export function VehicleScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Véhicule et sexe" session="R7">
      <Button label="Envoyer pour validation" onPress={() => router.push('/pending-validation')} />
    </ShellScreen>
  );
}
