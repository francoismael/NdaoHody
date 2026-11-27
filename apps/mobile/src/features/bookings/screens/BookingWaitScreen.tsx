import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDriverProfile } from '@/features/profile';
import { useTrip } from '@/features/trips';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, FormScreen, Icon } from '@/shared/ui';
import { formatAriary, formatCountdown } from '@/shared/utils';

import { useAnswerCountdown } from '../hooks/useAnswerCountdown';
import { useCancelReservation, useRefusalReason, useReservation, useRetryReservation } from '../hooks/useBookings';
import { ACCEPTED_STATUSES } from '../rules';

/**
 * Waiting for the driver (block 7). Only READS the reservation the server sent back
 * (GET /reservations/:id, polled every 3 s while it waits): the time left is computed from
 * `dateExpiration` on the app clock (right after a stay in the background), the server decides
 * the expiry. Each outcome has its next step. "Annuler" exists only while the driver has not answered.
 */
export function BookingWaitScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Number(id);
  const reservation = useReservation(reservationId);
  const data = reservation.data;
  const trip = useTrip(data?.trajetId ?? 0);
  const driver = useDriverProfile(trip.data?.chauffeurId ?? 0);
  const cancel = useCancelReservation();
  const retry = useRetryReservation();
  const refusal = useRefusalReason(reservationId, data?.statut === 'refusee');

  const { waiting, left, timeUp } = useAnswerCountdown(data, reservation.refetch);

  if (reservation.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de ta demande" />
      </View>
    );
  }

  const name = driver.data?.prenom ?? 'Le chauffeur';
  // Back to where the passenger chose this driver (home, search or profile).
  const otherDrivers = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const otherDriversButton = <Button label="Voir d’autres chauffeurs" icon="search" variant="secondary" onPress={otherDrivers} />;

  if (!data) {
    return (
      <FormScreen title="Demande introuvable" footer={otherDriversButton}>
        <Flash tone="danger" message={reservation.error?.message ?? 'Cette demande n’existe plus.'} />
      </FormScreen>
    );
  }

  const summary = (
    <View style={s.block} accessible>
      <Text style={s.label}>Ta demande</Text>
      <Text style={s.value}>
        {data.priseEnCharge.libelle} → {data.depose.libelle}
      </Text>
      <Text style={s.muted}>
        {data.places > 1 ? `${data.places} places` : '1 place'} · {formatAriary(data.prixTotal)}, en espèces au chauffeur
      </Text>
    </View>
  );

  if (waiting) {
    return (
      <FormScreen
        title={`Demande envoyée à ${name}`}
        subtitle="Il a 3 minutes pour répondre."
        footer={
          <Button
            label="Annuler ma demande"
            icon="x"
            variant="secondary"
            loading={cancel.isPending}
            onPress={() => cancel.mutate(reservationId)}
            hint="Possible tant que le chauffeur n’a pas répondu"
          />
        }
      >
        <View style={s.countdown} accessible accessibilityLiveRegion="polite" accessibilityLabel={timeUp ? 'Délai écoulé' : `Encore ${left} secondes`}>
          {timeUp ? <ActivityIndicator color={theme.colors.accent} /> : <Icon name="hourglass" tone="accent" size="lg" />}
          <Text style={s.clock}>{formatCountdown(left)}</Text>
          <Text style={s.centered}>{timeUp ? 'Délai écoulé, on vérifie…' : `En attente de la réponse de ${name}`}</Text>
        </View>
        {cancel.error ? <Flash tone="danger" message={cancel.error.message} /> : null}
        {summary}
        <Text style={s.centered}>
          À 0:00 sans réponse, ta demande expire : tu pourras la relancer ou choisir un autre chauffeur.
        </Text>
      </FormScreen>
    );
  }

  if (ACCEPTED_STATUSES.includes(data.statut)) {
    return (
      <FormScreen
        title={`${name} a accepté !`}
        subtitle="Ta place est réservée."
        footer={<Button label="Suivre le chauffeur" icon="car" onPress={() => router.replace({ pathname: '/ride/[id]', params: { id: String(data.id) } })} />}
      >
        <Flash tone="success" message={`${name} vient te chercher. Prépare ${formatAriary(data.prixTotal)} en espèces.`} />
        {summary}
      </FormScreen>
    );
  }

  if (data.statut === 'expiree') {
    return (
      <FormScreen
        title={`${name} n’a pas répondu`}
        subtitle="Ta demande a expiré au bout de 3 minutes."
        footer={
          <View style={s.footer}>
            <Button
              label="Relancer la demande"
              icon="refresh"
              loading={retry.isPending}
              onPress={() => retry.mutate(reservationId, { onSuccess: (next) => router.setParams({ id: String(next.id) }) })}
            />
            {otherDriversButton}
          </View>
        }
      >
        {retry.error ? <Flash tone="danger" message={retry.error.message} /> : null}
        {summary}
      </FormScreen>
    );
  }

  const refused = data.statut === 'refusee';
  const reason = refused ? (refusal.data?.motif ?? null) : null;
  return (
    <FormScreen
      title={refused ? `${name} a refusé ta demande` : data.statut === 'annulee_passager' ? 'Demande annulée' : `${name} a annulé`}
      subtitle={refused || data.statut === 'annulee_chauffeur' ? 'D’autres chauffeurs passent peut-être sur ton chemin.' : 'Tu n’as rien à payer.'}
      footer={otherDriversButton}
    >
      {refused ? (
        <View style={s.block} accessible accessibilityLiveRegion="polite">
          <Text style={s.label}>Motif donné par {name}</Text>
          {refusal.isPending ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement du motif" />
          ) : (
            <Text style={s.value}>{reason ?? (refusal.isError ? 'Le motif n’a pas pu être chargé.' : 'Aucun motif donné.')}</Text>
          )}
        </View>
      ) : null}
      {summary}
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    countdown: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[6] },
    clock: { ...typography.display, color: colors.text },
    block: { gap: spacing[1], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.fill },
    label: { ...typography.small, color: colors.textMuted },
    value: { ...typography.bodyStrong, color: colors.text },
    muted: { ...typography.small, color: colors.textMuted },
    centered: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
    footer: { gap: spacing[2] },
  });
