import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Réservation · coquille R1, contenu en R17. */
export function BookScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Réservation" session="R17">
      <Button label="Envoyer la demande" onPress={() => router.push('/booking-wait/demo')} />
    </ShellScreen>
  );
}
