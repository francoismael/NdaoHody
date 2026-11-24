import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Publier : tracé et places · coquille R1, contenu en R10. */
export function PublishRouteScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Publier : tracé et places" session="R10">
      <Button label="Publier le trajet" onPress={() => router.push('/my-trips')} />
    </ShellScreen>
  );
}
