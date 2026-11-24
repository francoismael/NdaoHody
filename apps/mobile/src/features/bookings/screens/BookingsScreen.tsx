import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Mes réservations · coquille R1, contenu en R19. */
export function BookingsScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Mes réservations" session="R19" safeTop>
      <Button label="Réservation en attente" onPress={() => router.push('/booking-wait/demo')} />
      <Button label="Course en cours" onPress={() => router.push('/ride/demo')} variant="secondary" />
    </ShellScreen>
  );
}
