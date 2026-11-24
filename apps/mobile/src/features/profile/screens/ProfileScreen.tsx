import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth';
import { Button, ShellScreen } from '@/shared/ui';

/** Profil · coquille R1, contenu en R5. */
export function ProfileScreen() {
  const router = useRouter();
  const { isDriver, signOut, switchRole } = useSession();

  return (
    <ShellScreen title="Profil" session="R5" safeTop>
      <Button label="Notifications" onPress={() => router.push('/notifications')} />
      <Button label={isDriver ? 'Passer en mode passager' : 'Passer en mode chauffeur'} onPress={switchRole} variant="secondary" />
      <Button label="Se déconnecter" onPress={signOut} variant="ghost" />
    </ShellScreen>
  );
}
