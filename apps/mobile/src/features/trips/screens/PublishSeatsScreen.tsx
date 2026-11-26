import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import type { Trajet, TypeTrajet } from '@contract';

import { usePriceEstimate } from '@/features/pricing';
import { useMe } from '@/features/profile';
import { VehicleCard } from '@/features/verification';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, ChoiceGroup, Flash, FormScreen, Icon, Stepper, type ChoiceOption, type FormScreenHandle } from '@/shared/ui';
import {
  currentTime,
  formatAriary,
  formatDayTime,
  formatDistance,
  formatDuration,
  isUserInputError,
  toIsoWithOffset,
} from '@/shared/utils';

import { usePublishAccess } from '../hooks/usePublishAccess';
import { usePublishTrip, useRouteBetween } from '../hooks/useTrips';
import { decodePlace } from '../publishParams';
import { PUBLISH_MESSAGES as M } from '../rules';

/** Default seats offered for a car (PWA). */
const DEFAULT_CAR_SEATS = 3;

const WHO: readonly ChoiceOption<'tous' | 'femmes'>[] = [
  { value: 'tous', label: 'Tout le monde' },
  { value: 'femmes', label: 'Femmes seulement', icon: 'gender-female' },
];

/**
 * Publish, step 3 of 3: seats, a summary, then the trip is published (simulated server).
 * The price is the server's (Tarif of the contract): shown, never computed here.
 */
export function PublishSeatsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ depart: string; arrivee: string; type: TypeTrajet; dateDepart?: string }>();
  const depart = useMemo(() => decodePlace(params.depart), [params.depart]);
  const arrivee = useMemo(() => decodePlace(params.arrivee), [params.arrivee]);
  const route = useRouteBetween(depart, arrivee);
  const access = usePublishAccess();
  const me = useMe();
  const publish = usePublishTrip();
  const form = useRef<FormScreenHandle>(null);

  // Several validated vehicles (3 at most): he picks the one of this trip, the default one to start with.
  const usable = access.status === 'ready' ? access.vehicles : [];
  const [chosenVehicleId, setChosenVehicleId] = useState<number | null>(null);
  const vehicle = usable.find((v) => v.id === chosenVehicleId) ?? usable[0] ?? null;
  const choosing = usable.length > 1;
  const isMoto = vehicle?.type === 'moto';
  const [chosenSeats, setChosenSeats] = useState<number | null>(null);
  // Always within the chosen vehicle's seats (the server checks it too).
  const seats = isMoto ? 1 : Math.min(chosenSeats ?? DEFAULT_CAR_SEATS, vehicle?.places ?? 1);
  const [who, setWho] = useState<'tous' | 'femmes'>('tous');
  const [seatsError, setSeatsError] = useState<string | null>(null);
  const [published, setPublished] = useState<Trajet | null>(null);
  const price = usePriceEstimate(route.data?.distanceMetres ?? null, 1, vehicle?.type ?? 'voiture');

  // Once published, Android back goes home: never back to a form that would publish twice.
  useEffect(() => {
    if (!published) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/');
      return true;
    });
    return () => sub.remove();
  }, [published, router]);

  const planned = params.type === 'a_l_avance' && params.dateDepart ? new Date(Number(params.dateDepart)) : null;
  const when = planned ? formatDayTime(planned, currentTime()) : 'maintenant';

  if (published) {
    return (
      <FormScreen
        title="Trajet publié !"
        subtitle={`${published.depart.libelle} → ${published.arrivee.libelle}, ${published.type === 'immediat' ? 'maintenant' : formatDayTime(new Date(published.dateDepart), currentTime())}.`}
        footer={<Button label="Retour à l’accueil" onPress={() => router.dismissTo('/')} />}
      >
        <Stack.Screen options={{ headerBackVisible: false }} />
        <View style={s.success} accessibilityLiveRegion="polite">
          <Icon name="circle-check" tone="accent" size="lg" />
          <Text style={s.successText}>
            Il est sur ton accueil. Les passagers dont le chemin croise le tien peuvent maintenant le réserver : tu recevras leurs demandes.
          </Text>
        </View>
      </FormScreen>
    );
  }

  if (access.status === 'loading' || route.isLoading || me.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement" />
      </View>
    );
  }

  const submit = () => {
    if (!route.data || !vehicle || publish.isPending) return;
    setSeatsError(null);
    publish.mutate(
      {
        type: planned ? 'a_l_avance' : 'immediat',
        depart: route.data.depart,
        arrivee: route.data.arrivee,
        chemin: route.data.chemin,
        distanceMetres: route.data.distanceMetres,
        dureeSecondes: route.data.dureeSecondes,
        placesTotal: seats,
        reserveFemmes: who === 'femmes',
        ...(choosing ? { vehiculeId: vehicle.id } : {}),
        ...(planned ? { dateDepart: toIsoWithOffset(planned, -planned.getTimezoneOffset()) } : {}),
      },
      {
        onSuccess: setPublished,
        onError: (error) => {
          if (isUserInputError(error) && error.message === M.seatsInvalid(vehicle.places)) {
            setSeatsError(error.message);
            form.current?.revealFirstError();
          }
        },
      },
    );
  };

  const bannerError =
    access.status === 'error'
      ? access.error.message
      : access.status === 'blocked'
        ? M.notValidated
        : !depart || !arrivee
          ? 'Trajet introuvable. Reviens à l’étape 1.'
          : route.isError
            ? route.error.message
            : publish.error && !seatsError
              ? publish.error.message
              : null;

  return (
    <FormScreen
      ref={form}
      title="Combien de places ?"
      subtitle="Étape 3 sur 3 · vérifie puis publie"
      footer={<Button label="Publier le trajet" icon="check" loading={publish.isPending} disabled={!vehicle || !route.data} onPress={submit} />}
    >
      {bannerError ? <Flash tone="danger" message={bannerError} /> : null}

      {choosing && vehicle ? (
        <View style={s.vehicles} accessibilityRole="radiogroup" accessibilityLabel="Avec quel véhicule ?">
          <Text style={s.question}>Avec quel véhicule ?</Text>
          {usable.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              selected={v.id === vehicle.id}
              onPress={() => {
                setChosenVehicleId(v.id);
                // New vehicle, new seats: back to the default for it.
                setChosenSeats(null);
                setSeatsError(null);
                // Glide down to the seats and the summary, as the sex choice at sign-up does.
                form.current?.revealEnd();
              }}
            />
          ))}
          <Text style={s.hint}>Seuls tes véhicules validés par l’équipe NdaoHody sont proposés.</Text>
        </View>
      ) : null}

      {vehicle ? (
        <Stepper
          label={isMoto ? 'Places passagers (une moto : 1 passager)' : 'Places passagers'}
          value={seats}
          min={1}
          max={vehicle.places}
          disabled={isMoto}
          error={seatsError}
          hint={`Ton véhicule en a ${vehicle.places} au plus.`}
          onChange={(value) => {
            setChosenSeats(value);
            setSeatsError(null);
          }}
        />
      ) : null}

      {me.data?.sexe === 'femme' ? (
        <ChoiceGroup
          label="Qui peut réserver ?"
          options={WHO}
          value={who}
          onChange={setWho}
          hint="Femmes seulement : seules les passagères verront ce trajet."
        />
      ) : null}

      {route.data ? (
        <View style={s.recap} accessible>
          <Text style={s.recapRoute}>
            {route.data.depart.libelle} → {route.data.arrivee.libelle}
          </Text>
          <Text style={s.recapLine}>Départ {when}</Text>
          <Text style={s.recapLine}>
            {formatDistance(route.data.distanceMetres)} · {formatDuration(route.data.dureeSecondes)}
          </Text>
          {vehicle ? (
            <Text style={s.recapLine}>
              {[vehicle.marque, vehicle.modele].filter(Boolean).join(' ') || (isMoto ? 'Moto' : 'Voiture')} · {vehicle.couleur} · {vehicle.immatriculation}
            </Text>
          ) : null}
          {price.data ? (
            <Text style={s.recapPrice}>
              Tout le trajet : {formatAriary(price.data.prixParPlace)} par place. Chaque passager paie selon ses kilomètres, calculé par NdaoHody.
            </Text>
          ) : null}
        </View>
      ) : null}
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    vehicles: { gap: spacing[2] },
    question: { ...typography.bodyStrong, color: colors.text },
    hint: { ...typography.small, color: colors.textMuted },
    recap: { gap: spacing[1], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.fill },
    recapRoute: { ...typography.bodyStrong, color: colors.text },
    recapLine: { ...typography.small, color: colors.textMuted },
    recapPrice: { ...typography.small, color: colors.text, marginTop: spacing[2] },
    success: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
    successText: { ...typography.body, color: colors.text, flex: 1 },
  });
