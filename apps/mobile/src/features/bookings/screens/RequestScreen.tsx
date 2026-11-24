import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Demande de réservation · coquille R1, contenu en R21. */
export function RequestScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Demande de réservation" session="R21">
      <Button label="Ouvrir la conversation" onPress={() => router.push('/conversation/demo')} />
    </ShellScreen>
  );
}
