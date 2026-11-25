import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Profil du chauffeur · coquille R1, contenu en R16. */
export function DriverProfileScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Profil du chauffeur" session="R16">
      <Button label="Réserver avec ce chauffeur" onPress={() => router.push('/book/demo')} />
    </ShellScreen>
  );
}
