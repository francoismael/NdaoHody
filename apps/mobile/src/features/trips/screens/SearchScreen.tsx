import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Recherche · coquille R1, contenu en R14. */
export function SearchScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Recherche" session="R14">
      <Button label="Voir les résultats" onPress={() => router.push('/results')} />
    </ShellScreen>
  );
}
