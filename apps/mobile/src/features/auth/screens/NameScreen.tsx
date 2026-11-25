import { useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';

import type { Sexe } from '@contract';

import { Button, ChoiceGroup, Flash, FormScreen, TextField, type ChoiceOption, type FormScreenHandle } from '@/shared/ui';

import { useCompleteSignUp } from '../hooks/useAuth';
import { FIRST_NAME_MIN, SIGN_UP_MESSAGES as M } from '../rules';

const NAME_MAX = 50;

const SEXES: readonly ChoiceOption<Sexe>[] = [
  { value: 'homme', label: 'Homme', icon: 'gender-male' },
  { value: 'femme', label: 'Femme', icon: 'gender-female' },
];

/**
 * Shown for a new account, and for an account without sex yet (made before it was asked
 * to everyone). The sex is asked here for everyone, like the back, and never changes after.
 */
export function NameScreen() {
  const completeSignUp = useCompleteSignUp();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [sexe, setSexe] = useState<Sexe | null>(null);
  const [prenomError, setPrenomError] = useState<string | null>(null);
  const [sexeError, setSexeError] = useState<string | null>(null);
  const lastName = useRef<TextInputInstance>(null);
  const form = useRef<FormScreenHandle>(null);

  const submit = () => {
    if (completeSignUp.isPending) return;
    const first = prenom.trim();
    const firstError = first.length === 0 ? M.firstNameMissing : first.length < FIRST_NAME_MIN ? M.firstNameShort : null;
    setPrenomError(firstError);
    setSexeError(sexe ? null : M.sexRequired);
    if (firstError || !sexe) {
      form.current?.revealFirstError();
      return;
    }
    completeSignUp.mutate({ prenom: first, nom: nom.trim() || null, sexe });
  };

  return (
    <FormScreen
      ref={form}
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
      />
      <ChoiceGroup
        label="Tu es"
        options={SEXES}
        value={sexe}
        onChange={(value) => {
          setSexe(value);
          setSexeError(null);
        }}
        error={sexeError}
        hint="Jamais montré aux autres : il sert aux trajets réservés aux femmes. Il ne pourra plus être modifié."
      />
    </FormScreen>
  );
}
