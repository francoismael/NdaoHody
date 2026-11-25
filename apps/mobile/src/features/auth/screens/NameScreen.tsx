import { Button, ShellScreen } from '@/shared/ui';

import { useSession } from '../hooks/useSession';

/** Ton nom complet · coquille R1, contenu en R4. */
export function NameScreen() {
  const { signIn } = useSession();

  return (
    <ShellScreen title="Ton nom complet" session="R4">
      <Button label="Créer mon compte" onPress={signIn} />
    </ShellScreen>
  );
}
