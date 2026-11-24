import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Résultats · coquille R1, contenu en R15. */
export function ResultsScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Résultats" session="R15">
      <Button label="Voir le chauffeur" onPress={() => router.push('/driver/demo')} />
      <Button label="Réserver ce trajet" onPress={() => router.push('/book/demo')} variant="secondary" />
    </ShellScreen>
  );
}
