import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Code reçu par SMS · coquille R1, contenu en R4. */
export function CodeScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Code reçu par SMS" session="R4">
      <Button label="Vérifier le code" onPress={() => router.push('/name')} />
    </ShellScreen>
  );
}
