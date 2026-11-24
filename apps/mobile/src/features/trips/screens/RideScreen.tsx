import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Course en direct (passager) · coquille R1, contenu en R22. */
export function RideScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Course en direct (passager)" session="R22">
      <Button label="Discuter avec le chauffeur" onPress={() => router.push('/conversation/demo')} />
      <Button label="Urgence et partage" onPress={() => router.push('/emergency')} variant="secondary" />
      <Button label="Arrivée : noter le chauffeur" onPress={() => router.push('/rating/demo')} variant="secondary" />
    </ShellScreen>
  );
}
