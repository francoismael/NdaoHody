import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import type { TypeDocument } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, FormScreen, Icon, TextField, type IconName } from '@/shared/ui';
import { isUserInputError } from '@/shared/utils';

import { DocumentCamera } from '../components/DocumentCamera';
import { useActiveVehicles, useMyApplication, useSendDocument } from '../hooks/useVerification';
import { DOCUMENT_LABELS, VERIFICATION_MESSAGES, documentsToSend, driverStep, normalizeLicenseNumber } from '../rules';
import type { DriverApplication } from '../types';

type Phase = 'intro' | 'licence' | 'camera';

const STEPS: { icon: IconName; text: string }[] = [
  { icon: 'camera', text: 'Ton permis, recto et verso' },
  { icon: 'user', text: 'Un selfie, visage bien visible' },
  { icon: 'car', text: 'Ton véhicule et sa plaque' },
];

/**
 * "Vérifions ton profil": licence number, then the photos still to send
 * (all of them the first time, only the refused ones after a refusal),
 * through the single camera. Then the vehicle, or the waiting screen.
 */
export function VerificationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const application = useMyApplication();
  const vehicles = useActiveVehicles();
  const send = useSendDocument();
  const [phase, setPhase] = useState<Phase>('intro');
  // Snapshot taken on "Commencer": the queue does not move while photos are being sent.
  const [queue, setQueue] = useState<TypeDocument[]>([]);
  const [index, setIndex] = useState(0);
  const [licence, setLicence] = useState<string | null>(null);
  const [licenceError, setLicenceError] = useState<string | null>(null);

  if (application.isPending || vehicles.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de ton dossier" />
      </View>
    );
  }

  if (application.isError || vehicles.isError) {
    return (
      <View style={[s.screen, s.content]}>
        <Flash tone="danger" message={(application.error ?? vehicles.error)?.message ?? 'Lecture impossible.'} />
        <Button
          label="Réessayer"
          icon="refresh"
          variant="secondary"
          onPress={() => {
            void application.refetch();
            void vehicles.refetch();
          }}
        />
      </View>
    );
  }

  const data = application.data;
  const licenceValue = licence ?? data.numeroPermis ?? '';
  const toSend = documentsToSend(data.documents);
  const refused = data.documents.filter((d) => d.statut === 'refuse');

  /** Next screen, decided by the server's answer. */
  const leave = (latest: DriverApplication): void => {
    const step = driverStep(latest.statutChauffeur, latest.documents, (vehicles.data ?? []).length > 0);
    router.replace(step === 'vehicle' ? '/vehicle' : '/pending-validation');
  };

  const start = (): void => {
    if (toSend.length === 0) {
      leave(data);
      return;
    }
    setQueue(toSend);
    setIndex(0);
    setPhase(toSend[0] === 'permis_recto' ? 'licence' : 'camera');
  };

  const confirmLicence = (): void => {
    if (!normalizeLicenseNumber(licenceValue)) {
      setLicenceError(VERIFICATION_MESSAGES.licenseInvalid);
      return;
    }
    setPhase('camera');
  };

  const accept = (temporaryUri: string): void => {
    const type = queue[index];
    const numeroPermis = type === 'permis_recto' ? (normalizeLicenseNumber(licenceValue) ?? undefined) : undefined;
    send.mutate(
      { type, temporaryUri, numeroPermis },
      {
        onSuccess: (latest) => {
          send.reset();
          if (index + 1 < queue.length) setIndex(index + 1);
          else leave(latest);
        },
        onError: (error) => {
          // The licence number was refused (format, or already used): back to its field.
          if (type === 'permis_recto' && isUserInputError(error) && error.status !== 403) {
            setLicenceError(error.message);
            setPhase('licence');
          }
        },
      },
    );
  };

  if (phase === 'camera') {
    const kind = queue[index];
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DocumentCamera
          key={kind}
          kind={kind}
          progress={`Photo ${index + 1} sur ${queue.length}`}
          onAccept={accept}
          sending={send.isPending}
          error={send.error?.message ?? null}
        />
      </>
    );
  }

  if (phase === 'licence') {
    return (
      <FormScreen
        title="Ton numéro de permis"
        subtitle="Sur le recto de ton permis biométrique, c’est le numéro de la ligne « 5 ». Un permis ne peut être lié qu’à un seul compte NdaoHody."
        footer={<Button label="Continuer : photo du recto" icon="camera" onPress={confirmLicence} />}
      >
        <TextField
          label="Numéro de permis"
          kind="reference"
          value={licenceValue}
          onChangeText={(text) => {
            setLicence(text);
            setLicenceError(null);
          }}
          error={licenceError}
          hint="Champ 5 du recto : 5 à 20 lettres ou chiffres, recopiés tels quels."
          placeholder="AB123456"
          maxLength={40}
          autoFocus
          onSubmitEditing={confirmLicence}
        />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title={refused.length > 0 ? 'Corrige ton dossier' : 'Vérifions ton profil'}
      subtitle={
        refused.length > 0
          ? 'Reprends seulement les photos refusées.'
          : 'Ton permis et une photo de toi, puis ton véhicule. Environ 3 minutes.'
      }
      footer={<Button label={refused.length > 0 ? 'Reprendre les photos' : 'Commencer'} icon="camera" onPress={start} />}
    >
      {refused.map((d) => (
        <Flash key={d.id} tone="danger" message={`${DOCUMENT_LABELS[d.type]} refusé : ${d.motifRefus ?? 'sans motif'}`} />
      ))}
      <View style={s.list}>
        {STEPS.map((step) => (
          <View key={step.text} style={s.item}>
            <Icon name={step.icon} tone="accent" />
            <Text style={s.itemText}>{step.text}</Text>
          </View>
        ))}
      </View>
      <View style={s.tips} accessible>
        <Text style={s.tipsTitle}>Pour une photo acceptée du premier coup</Text>
        <Text style={s.tip}>• Un endroit bien éclairé, sans reflet sur le permis.</Text>
        <Text style={s.tip}>• Le permis à plat, les 4 coins dans le cadre.</Text>
        <Text style={s.tip}>• Le téléphone immobile au moment de la photo.</Text>
      </View>
      <Text style={s.privacy}>Tes photos ne sont vues que par l’équipe NdaoHody, pour vérifier ton dossier.</Text>
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[4] },
    list: { gap: spacing[3] },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    itemText: { ...typography.body, color: colors.text, flexShrink: 1 },
    tips: { padding: spacing[4], gap: spacing[1], borderRadius: radii.md, backgroundColor: colors.surface },
    tipsTitle: { ...typography.bodyStrong, color: colors.text },
    tip: { ...typography.small, color: colors.textMuted },
    privacy: { ...typography.small, color: colors.textMuted },
  });
