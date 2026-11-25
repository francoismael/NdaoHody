import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Publier : départ et destination · coquille R1, contenu en R9. */
export function PublishScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Publier : départ et destination" session="R9" safeTop>
      <Button label="Continuer : tracé et places" onPress={() => router.push('/publish-route')} />
    </ShellScreen>
  );
}
