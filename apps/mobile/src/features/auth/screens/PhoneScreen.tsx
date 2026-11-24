import { useRouter } from 'expo-router';

import { Button, ShellScreen } from '@/shared/ui';

/** Ton numéro · coquille R1, contenu en R4. */
export function PhoneScreen() {
  const router = useRouter();

  return (
    <ShellScreen title="Ton numéro" session="R4" safeTop>
      <Button label="Recevoir le code" onPress={() => router.push('/code')} />
      {/* PROVISOIRE (R1) : écran de contrôle, en dev seulement. */}
      {__DEV__ && (
        <Button label="Écran de contrôle" onPress={() => router.push('/control')} variant="ghost" />
      )}
    </ShellScreen>
  );
}
