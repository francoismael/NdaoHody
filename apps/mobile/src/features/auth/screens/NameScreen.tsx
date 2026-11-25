import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import { Button, Flash, FormScreen, TextField } from '@/shared/ui';

import { useCompleteSignUp } from '../hooks/useAuth';

const NAME_MAX = 50;

/** Shown only for a new account. No sex here: it is asked to drivers only (vehicle step). */
export function NameScreen() {
  const completeSignUp = useCompleteSignUp();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [prenomError, setPrenomError] = useState<string | null>(null);
  const lastName = useRef<TextInputInstance>(null);

  const submit = () => {
    if (completeSignUp.isPending) return;
    const first = prenom.trim();
    if (first.length < 2) {
      setPrenomError(first.length === 0 ? 'Écris ton prénom : il sera vu par les chauffeurs.' : 'Ton prénom doit avoir au moins 2 lettres.');
      return;
    }
    completeSignUp.mutate({ prenom: first, nom: nom.trim() || null });
  };

  return (
    <FormScreen
      title="Comment t’appelles-tu ?"
      subtitle="Ton prénom est montré aux chauffeurs et aux passagers de tes trajets."
      footer={<Button label="Créer mon compte" onPress={submit} loading={completeSignUp.isPending} />}
    >
      {completeSignUp.error ? <Flash tone="danger" message={completeSignUp.error.message} /> : null}
      <TextField
        label="Prénom"
        kind="givenName"
        value={prenom}
        onChangeText={(text) => {
          setPrenom(text);
          setPrenomError(null);
        }}
        error={prenomError}
        maxLength={NAME_MAX}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => lastName.current?.focus()}
      />
      <TextField
        ref={lastName}
        label="Nom (facultatif)"
        kind="familyName"
        value={nom}
        onChangeText={setNom}
        maxLength={NAME_MAX}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </FormScreen>
  );
}
