import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Course en direct (chauffeur) · coquille R1, contenu en R23 à R28. */
export function DrivingScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Course en direct (chauffeur)" session="R23 à R28">
      <Button label="Discuter avec le passager" onPress={() => router.push('/conversation/demo')} />
      <Button label="Urgence et partage" onPress={() => router.push('/emergency')} variant="secondary" />
      <Button label="Terminer : noter le passager" onPress={() => router.push('/rating/demo')} variant="secondary" />
    </ShellScreen>
  );
}
