import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Messages · coquille R1, contenu en R30. */
export function MessagesScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Messages" session="R30" safeTop>
      <Button label="Ouvrir une conversation" onPress={() => router.push('/conversation/demo')} />
    </ShellScreen>
  );
}
