import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Réservation · coquille R1, contenu au bloc 7. `id` = the chosen trip (from the passenger home or the results). */
export function BookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ShellScreen title={`Réservation · trajet ${id}`} session="bloc 7">
      <Button label="Envoyer la demande" onPress={() => router.push('/booking-wait/demo')} />
    </ShellScreen>
  );
}
