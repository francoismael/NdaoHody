import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** En attente du chauffeur · coquille R1, contenu en R18. */
export function BookingWaitScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="En attente du chauffeur" session="R18">
      <Button label="Le chauffeur accepte" onPress={() => router.push('/ride/demo')} />
    </ShellScreen>
  );
}
