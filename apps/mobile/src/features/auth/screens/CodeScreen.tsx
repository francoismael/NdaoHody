import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, CodeInput, Flash, FormScreen } from '@/shared/ui';
import { currentTimeMs, formatPhoneNumber, isUserInputError, useSecondsLeft } from '@/shared/utils';

import { DEMO_CODE_HINT, useRequestOtp, useVerifyOtp } from '../hooks/useAuth';

const CODE_LENGTH = 6;
const DEFAULT_RESEND_SECONDS = 60;

/** Code reçu par SMS. Six digits typed, pasted or autofilled; checked as soon as they are all there. */
export function CodeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ telephone?: string; resendIn?: string }>();
  const telephone = params.telephone ?? '';
  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(
    () => currentTimeMs() + (Number(params.resendIn) || DEFAULT_RESEND_SECONDS) * 1000,
  );
  const secondsLeft = useSecondsLeft(resendAt);

  // Opened without a number (old link): back to the start.
  useEffect(() => {
    if (!telephone) router.replace('/phone');
  }, [telephone, router]);

  const verify = (value: string) => {
    if (value.length !== CODE_LENGTH || verifyOtp.isPending) return;
    verifyOtp.mutate(
      { telephone, code: value },
      {
        // Known account: signed in, the guards open the home screen by themselves.
        onSuccess: ({ nouveau }) => {
          if (nouveau) router.replace('/name');
        },
        onError: () => setCode(''),
      },
    );
  };

  const change = (value: string) => {
    setCode(value);
    setNotice(null);
    if (verifyOtp.isError) verifyOtp.reset();
    verify(value);
  };

  const resend = () =>
    requestOtp.mutate(telephone, {
      onSuccess: ({ resendInSeconds }) => {
        setResendAt(currentTimeMs() + resendInSeconds * 1000);
        setCode('');
        verifyOtp.reset();
        setNotice('Nouveau code envoyé.');
      },
    });

  const error = verifyOtp.error ?? requestOtp.error;
  const codeError = isUserInputError(verifyOtp.error) ? verifyOtp.error.message : null;
  const bannerError = error && !isUserInputError(verifyOtp.error) ? error.message : null;

  return (
    <FormScreen
      title="Code reçu par SMS"
      subtitle={`Envoyé au ${formatPhoneNumber(telephone)}. Il reste valable 5 minutes.`}
      footer={
        <>
          <Button
            label="Vérifier"
            onPress={() => verify(code)}
            loading={verifyOtp.isPending}
            disabled={code.length !== CODE_LENGTH}
          />
          <Button
            label={secondsLeft > 0 ? `Renvoyer le code dans ${secondsLeft} s` : 'Renvoyer le code'}
            onPress={resend}
            variant="ghost"
            icon="refresh"
            disabled={secondsLeft > 0}
            loading={requestOtp.isPending}
          />
        </>
      }
    >
      {notice ? <Flash tone="success" message={notice} /> : null}
      {bannerError ? <Flash tone="danger" message={bannerError} /> : null}
      <CodeInput label="Code à 6 chiffres reçu par SMS" value={code} onChangeText={change} length={CODE_LENGTH} error={codeError} />
      {/* PROVISIONAL (simulated SMS). */}
      <Text style={styles.hint}>
        Démo : le code est {DEMO_CODE_HINT}.
      </Text>
    </FormScreen>
  );
}

const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({ hint: { ...typography.small, color: colors.textMuted, textAlign: 'center' } });
