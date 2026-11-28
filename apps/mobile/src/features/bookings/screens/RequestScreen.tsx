import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { ProfilPublic, Reservation } from '@contract';

import { UserBadge, formatRating, toDisplayBadge, usePublicProfile } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Button, Flash, FormScreen, Icon, Tag, TextField, type FormScreenHandle } from '@/shared/ui';
import { formatAriary, formatCountdown, formatDistance } from '@/shared/utils';

import { useAnswerCountdown } from '../hooks/useAnswerCountdown';
import { useAcceptReservation, useRefusalReason, useRefuseReservation, useReservation } from '../hooks/useBookings';
import { ACCEPTED_STATUSES, ANSWER_DELAY_MINUTES, REFUSAL_REASON_MAX, refusalReasonError } from '../rules';

/** Shortcuts that fill the field: the rule stays the back's (free text, 3 to 255 characters). */
const QUICK_REASONS = ['Plus de place', 'Je ne passe plus par là', 'Point trop loin'] as const;

const placesText = (n: number): string => (n > 1 ? `${n} places` : '1 place');

/**
 * A booking request, seen by the driver (bloc 8), opened by the notification.
 * Who asks (name, photo, badge), what (seats, pickup, drop), the price and the time left.
 * Accept / refuse with a reason. At 0:00 the buttons are off: the server decides, and refuses
 * any answer on an expired request.
 */
export function RequestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const form = useRef<FormScreenHandle>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Number(id);
  const reservation = useReservation(reservationId);
  const data = reservation.data;
  const passenger = usePublicProfile(data?.passagerId ?? 0);
  const accept = useAcceptReservation();
  const refuse = useRefuseReservation();
  const refusal = useRefusalReason(reservationId, data?.statut === 'refusee');
  const { waiting, left, timeUp } = useAnswerCountdown(data, reservation.refetch);
  const [refusing, setRefusing] = useState(false);
  const [motif, setMotif] = useState('');
  const [motifError, setMotifError] = useState<string | null>(null);

  if (reservation.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de la demande" />
      </View>
    );
  }

  const homeButton = <Button label="Retour à l’accueil" variant="secondary" onPress={() => router.replace('/')} />;

  if (!data) {
    return (
      <FormScreen title="Demande introuvable" footer={homeButton}>
        <Flash tone="danger" message={reservation.error?.message ?? 'Cette demande n’existe plus.'} />
      </FormScreen>
    );
  }

  const profile = passenger.data;
  const name = profile?.prenom || 'Le passager';
  const details = <RequestDetails reservation={data} name={name} s={s} profile={profile} />;

  if (waiting) {
    const busy = accept.isPending || refuse.isPending;
    const error = accept.error ?? refuse.error;
    // A refused answer (expired, no seats left): read the request again, it says why.
    const refresh = () => void reservation.refetch();
    const changeMotif = (text: string) => {
      setMotif(text);
      setMotifError(null);
    };
    const sendRefusal = () => {
      const problem = refusalReasonError(motif);
      if (problem) {
        setMotifError(problem);
        form.current?.revealFirstError();
        return;
      }
      refuse.mutate({ reservationId, motif: motif.trim() }, { onError: refresh });
    };
    const openRefusal = () => {
      setRefusing(true);
      form.current?.revealEnd();
    };

    return (
      <FormScreen
        ref={form}
        title={`${name} demande ${placesText(data.places)}`}
        subtitle={`Réponds dans les ${ANSWER_DELAY_MINUTES} minutes.`}
        footer={
          refusing ? (
            <View style={s.footer}>
              <Button label="Envoyer le refus" icon="x" variant="danger" loading={refuse.isPending} disabled={timeUp || accept.isPending} onPress={sendRefusal} />
              <Button label="Retour" variant="ghost" disabled={busy} onPress={() => setRefusing(false)} />
            </View>
          ) : (
            <View style={s.footer}>
              <Button
                label="Accepter"
                icon="check"
                loading={accept.isPending}
                disabled={timeUp || refuse.isPending}
                onPress={() => accept.mutate(reservationId, { onError: refresh })}
                hint="Ses places sont réservées sur ton trajet"
              />
              <Button label="Refuser" icon="x" variant="secondary" disabled={timeUp || busy} onPress={openRefusal} />
            </View>
          )
        }
      >
        <View style={s.countdown} accessible accessibilityLiveRegion="polite" accessibilityLabel={timeUp ? 'Délai écoulé' : `Encore ${left} secondes pour répondre`}>
          {timeUp ? <ActivityIndicator color={theme.colors.accent} /> : <Icon name="hourglass" tone="accent" size="lg" />}
          <Text style={s.clock}>{formatCountdown(left)}</Text>
          <Text style={s.centered}>{timeUp ? 'Délai écoulé, on vérifie…' : 'pour répondre'}</Text>
        </View>
        {error ? <Flash tone="danger" message={error.message} /> : null}
        {details}
        {refusing ? (
          <View style={s.reasons}>
            <Text style={s.label}>Pourquoi refuses-tu ?</Text>
            <View style={s.chips}>
              {QUICK_REASONS.map((reason) => (
                <Tag key={reason} label={reason} tone={motif === reason ? 'accent' : 'neutral'} onPress={() => changeMotif(reason)} />
              ))}
            </View>
            <TextField
              label="Motif du refus"
              value={motif}
              onChangeText={changeMotif}
              error={motifError}
              hint="Obligatoire : le passager le verra."
              maxLength={REFUSAL_REASON_MAX}
              returnKeyType="done"
              onSubmitEditing={sendRefusal}
            />
          </View>
        ) : null}
      </FormScreen>
    );
  }

  if (ACCEPTED_STATUSES.includes(data.statut)) {
    return (
      <FormScreen
        title={`Tu as accepté ${name}`}
        subtitle="Ses places sont réservées sur ton trajet."
        footer={
          <View style={s.footer}>
            <Button label={`Aller chercher ${name}`} icon="car" onPress={() => router.replace({ pathname: '/driving/[id]', params: { id: String(data.id) } })} />
            {homeButton}
          </View>
        }
      >
        <Flash tone="success" message={`${name} est prévenu. Passe le prendre à ${data.priseEnCharge.libelle}.`} />
        {details}
      </FormScreen>
    );
  }

  if (data.statut === 'expiree') {
    return (
      <FormScreen title="Demande expirée" subtitle={`Tu n’as pas répondu dans les ${ANSWER_DELAY_MINUTES} minutes. ${name} peut te relancer.`} footer={homeButton}>
        {details}
      </FormScreen>
    );
  }

  if (data.statut === 'refusee') {
    return (
      <FormScreen title="Demande refusée" subtitle={`${name} a reçu ton motif.`} footer={homeButton}>
        <View style={s.block} accessible>
          <Text style={s.label}>Ton motif</Text>
          {refusal.isPending ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement du motif" />
          ) : (
            <Text style={s.value}>{refusal.data?.motif ?? 'Le motif n’a pas pu être chargé.'}</Text>
          )}
        </View>
        {details}
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Demande annulée" subtitle={`${name} a annulé sa demande avant ta réponse.`} footer={homeButton}>
      {details}
    </FormScreen>
  );
}

type Styles = ReturnType<typeof createStyles>;

/** Who asks and what: shared by every state of the screen. */
function RequestDetails({
  reservation,
  name,
  profile,
  s,
}: {
  reservation: Reservation;
  name: string;
  profile: ProfilPublic | undefined;
  s: Styles;
}) {
  const rating =
    !profile || profile.noteMoyenne === null ? 'Pas encore noté' : `${formatRating(profile.noteMoyenne)} · ${profile.nombreNotes} avis`;
  return (
    <>
      <View style={s.person} accessible accessibilityLabel={`${name}, ${rating}`}>
        <Avatar name={name} photoUrl={profile?.photoUrl} />
        <View style={s.who}>
          <Text style={s.value}>{name}</Text>
          <Text style={s.muted}>{rating}</Text>
        </View>
        {profile ? <UserBadge badge={toDisplayBadge(profile.badge)} /> : null}
      </View>
      <View style={s.block} accessible>
        <Text style={s.label}>Prise en charge</Text>
        <Text style={s.value}>{reservation.priseEnCharge.libelle}</Text>
        <Text style={[s.label, s.gap]}>Dépose</Text>
        <Text style={s.value}>{reservation.depose.libelle}</Text>
        <Text style={[s.muted, s.gap]}>
          {placesText(reservation.places)} · {formatDistance(reservation.distanceMetres)} · {formatAriary(reservation.prixTotal)}, en espèces
        </Text>
      </View>
    </>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    countdown: { alignItems: 'center', gap: spacing[2], paddingVertical: spacing[6] },
    clock: { ...typography.display, color: colors.text },
    person: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    who: { flex: 1, gap: spacing[1] },
    block: { gap: spacing[1], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.fill },
    gap: { marginTop: spacing[2] },
    label: { ...typography.small, color: colors.textMuted },
    value: { ...typography.bodyStrong, color: colors.text },
    muted: { ...typography.small, color: colors.textMuted },
    centered: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
    reasons: { gap: spacing[3] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    footer: { gap: spacing[2] },
  });
