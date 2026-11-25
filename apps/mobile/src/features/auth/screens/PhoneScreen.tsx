import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Button, Flash, FormScreen, TextField } from '@/shared/ui';
import {
  formatPhoneInput,
  isUserInputError,
  normalizePhoneNumber,
  phoneProblem,
  PHONE_EXAMPLE,
  toNationalDigits,
  type PhoneProblem,
} from '@/shared/utils';

import { useRequestOtp } from '../hooks/useAuth';

/** Each message says what to fix, not only "invalid". */
const problemMessages: Record<PhoneProblem, string> = {
  empty: `Écris ton numéro de téléphone. Exemple : ${PHONE_EXAMPLE}.`,
  operator: 'Ce numéro doit commencer par 032 à 039.',
  incomplete: `Il manque des chiffres : un numéro en a 10, comme ${PHONE_EXAMPLE}.`,
};

/** Ton numéro: first screen of the app. Sends the SMS, then opens the code screen. */
export function PhoneScreen() {
  const router = useRouter();
  const requestOtp = useRequestOtp();
  const [digits, setDigits] = useState('');
  const [problem, setProblem] = useState<PhoneProblem | null>(null);

  const change = (text: string) => {
    setDigits(toNationalDigits(text));
    setProblem(null);
    requestOtp.reset();
  };

  const submit = () => {
    if (requestOtp.isPending) return; // double tap: one SMS
    const found = phoneProblem(digits);
    const telephone = normalizePhoneNumber(digits);
    if (found || !telephone) {
      setProblem(found ?? 'operator');
      return;
    }
    requestOtp.mutate(telephone, {
      onSuccess: ({ resendInSeconds }) =>
        router.push({ pathname: '/code', params: { telephone, resendIn: String(resendInSeconds) } }),
    });
  };

  const fieldError = problem ? problemMessages[problem] : isUserInputError(requestOtp.error) ? requestOtp.error.message : null;
  const bannerError = requestOtp.error && !isUserInputError(requestOtp.error) ? requestOtp.error.message : null;

  return (
    <FormScreen
      safeTop
      title="Ton numéro"
      subtitle="On t’envoie un code par SMS pour vérifier que c’est bien toi."
      footer={
        <>
          <Button label="Recevoir le code" onPress={submit} loading={requestOtp.isPending} hint="Envoie un SMS au numéro saisi" />
          {/* PROVISOIRE (R1) : écran de contrôle, en dev seulement. */}
          {__DEV__ && <Button label="Écran de contrôle" onPress={() => router.push('/control')} variant="ghost" />}
        </>
      }
    >
      {bannerError ? <Flash tone="danger" message={bannerError} /> : null}
      <TextField
        label="Numéro de téléphone"
        kind="phone"
        value={formatPhoneInput(digits)}
        onChangeText={change}
        placeholder={PHONE_EXAMPLE}
        hint="Orange, Airtel ou Yas : 032 à 039."
        error={fieldError}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
    </FormScreen>
  );
}
