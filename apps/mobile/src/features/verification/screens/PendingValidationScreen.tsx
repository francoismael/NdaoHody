import { useMemo } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { StatutValidation, StatutVehicule } from '@contract';

import { useSession } from '@/features/auth';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Icon, Tag, type IconName, type TagTone } from '@/shared/ui';

import { useActiveVehicles, useMyApplication } from '../hooks/useVerification';
import { DOCUMENT_LABELS, driverStep, type DriverStep } from '../rules';

const STATUS_TAGS: Record<StatutValidation | StatutVehicule, { label: string; tone: TagTone }> = {
  en_attente: { label: 'En vérification', tone: 'neutral' },
  valide: { label: 'Validé', tone: 'accent' },
  refuse: { label: 'Refusé', tone: 'info' },
  archive: { label: 'Archivé', tone: 'neutral' },
};

const HEADS: Record<DriverStep, { icon: IconName; title: string; text: string }> = {
  pending: {
    icon: 'hourglass',
    title: 'Dossier en cours de vérification',
    text: 'L’équipe NdaoHody vérifie tes photos. Tu recevras une notification dès qu’elle aura répondu.',
  },
  refused: {
    icon: 'alert-circle',
    title: 'Dossier à corriger',
    text: 'Certaines photos n’ont pas été acceptées. Reprends-les : tu pourras publier dès que ton dossier sera validé.',
  },
  validated: {
    icon: 'shield-check',
    title: 'Tu es chauffeur vérifié',
    text: 'Ton badge « Vérifié » est visible sur ton profil. Tu peux publier tes trajets.',
  },
  documents: { icon: 'camera', title: 'Dossier incomplet', text: 'Il manque des photos de ton permis ou ton selfie.' },
  vehicle: { icon: 'car', title: 'Dossier incomplet', text: 'Il manque ton véhicule.' },
  suspended: {
    icon: 'alert-circle',
    title: 'Activité suspendue',
    text: 'Ton activité de chauffeur est suspendue. Contacte le support NdaoHody.',
  },
};

/**
 * Waiting screen: what was sent (photos kept on the phone, so still there after a restart)
 * and what the back-office answered. Never a dead end: switching to passenger is always here.
 */
export function PendingValidationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { setRole } = useSession();
  const application = useMyApplication();
  const vehicles = useActiveVehicles();

  const toPassenger = (
    <Button label="Passer en mode passager" icon="user" variant="secondary" onPress={() => setRole('passager')} />
  );

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
        {toPassenger}
      </View>
    );
  }

  const { statutChauffeur, documents } = application.data;
  // useActiveVehicles filters `data`, so TypeScript no longer narrows it after isPending.
  const vehicule = vehicles.data?.[0] ?? null;
  const step = driverStep(statutChauffeur, documents, vehicule !== null);
  const head = HEADS[step];
  const refreshing = application.isRefetching || vehicles.isRefetching;

  const items = [
    ...documents.map((d) => ({ key: `doc-${d.id}`, label: DOCUMENT_LABELS[d.type], uri: d.fichierUrl, statut: d.statut, motif: d.motifRefus })),
    ...(vehicule
      ? [{ key: `veh-${vehicule.id}`, label: `Véhicule ${vehicule.immatriculation}`, uri: vehicule.photoUrl, statut: vehicule.statut, motif: vehicule.motifRefus }]
      : []),
  ];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void application.refetch();
            void vehicles.refetch();
          }}
          colors={[theme.colors.accent]}
        />
      }
    >
      <View style={s.head} accessible accessibilityLiveRegion="polite">
        <Icon name={head.icon} size="lg" tone={step === 'refused' || step === 'suspended' ? 'danger' : 'accent'} />
        <Text style={s.title} accessibilityRole="header">
          {head.title}
        </Text>
        <Text style={s.text}>{head.text}</Text>
      </View>

      <View style={s.grid}>
        {items.map((item) => {
          const tag = STATUS_TAGS[item.statut];
          // Seeded demo files are not real pictures (mock://): no thumbnail for them.
          const hasPicture = item.uri.startsWith('file:');
          return (
            <View key={item.key} style={s.card}>
              {hasPicture ? (
                <Image source={{ uri: item.uri }} style={s.thumb} accessibilityLabel={item.label} />
              ) : (
                <View style={[s.thumb, s.center]}>
                  <Icon name="camera" tone="muted" />
                </View>
              )}
              <Text style={s.cardLabel}>{item.label}</Text>
              <Tag label={tag.label} tone={tag.tone} icon={item.statut === 'refuse' ? 'alert-circle' : item.statut === 'valide' ? 'check' : undefined} />
              {item.motif ? <Text style={s.motif}>Motif : {item.motif}</Text> : null}
            </View>
          );
        })}
      </View>

      <View style={s.actions}>
        {step === 'refused' || step === 'documents' ? (
          <Button label="Corriger ma fiche" icon="pencil" onPress={() => router.push('/verification')} />
        ) : null}
        {step === 'vehicle' ? <Button label="Ajouter mon véhicule" icon="car" onPress={() => router.push('/vehicle')} /> : null}
        {step === 'validated' ? <Button label="Aller à l’accueil" icon="check" onPress={() => router.replace('/')} /> : null}
        {step !== 'validated' ? toPassenger : null}
      </View>
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[6], paddingBottom: spacing[10] },
    head: { alignItems: 'center', gap: spacing[2] },
    title: { ...typography.title, color: colors.text, textAlign: 'center' },
    text: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
    card: {
      width: '47%',
      flexGrow: 1,
      padding: spacing[3],
      gap: spacing[2],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    thumb: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.sm, backgroundColor: colors.fill },
    cardLabel: { ...typography.bodyStrong, color: colors.text },
    motif: { ...typography.small, color: colors.danger },
    actions: { gap: spacing[3] },
  });
