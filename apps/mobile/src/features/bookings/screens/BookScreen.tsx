import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { DemandeReservation, Lieu, Position } from '@contract';

import { useReservationQuote } from '@/features/pricing';
import {
  contractLieu,
  PICKUP_MAX_WALK_METRES,
  DriverSummary,
  driverSummaryLabel,
  passingWhen,
  PlaceField,
  PlacePicker,
  readBookingLink,
  toChosenPlace,
  useDemoPosition,
  useNearestPlace,
  useTrip,
  type BookingParams,
  type ChosenPlace,
} from '@/features/trips';
import { nearestPointIndex, spanOnPath, type LngLat } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, FormScreen, Icon, Stepper } from '@/shared/ui';
import { formatAriary, formatDistance } from '@/shared/utils';

import { useCreateReservation, useMyReservations, useRefusalReason } from '../hooks/useBookings';
import { ACTIVE_BOOKING_STATUSES, ANSWER_DELAY_MINUTES, pathSpanMessage } from '../rules';

const seatsText = (n: number): string => (n > 1 ? `${n} places` : '1 place');

const chosen = (lieu: Lieu): ChosenPlace => ({ ...lieu, placeId: null });

const toLngLat = ({ longitude, latitude }: Position): LngLat => [longitude, latitude];

type Picking = 'pickup' | 'drop' | null;

/**
 * The booking window (block 7), opened only through bookingHref (home, search, driver profile).
 * Seats, pickup and drop (any part of the driver's path, chosen like in the search: "my position"
 * or a place, over the driver's road), the server's price, cash to the driver, then the request.
 * The waiting screen opens on the server's answer, never on the tap.
 */
export function BookScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<BookingParams & { id: string }>();
  const link = useMemo(() => readBookingLink(params), [params]);
  const trip = useTrip(link?.tripId ?? Number(params.id));
  const create = useCreateReservation();
  const mine = useMyReservations();
  // My last request on this trip (newest first, the server's order): if the driver refused it, say why.
  const lastHere = mine.data?.find((r) => r.trajetId === link?.tripId);
  const refusedHere = lastHere?.statut === 'refusee' ? lastHere : undefined;
  const refusal = useRefusalReason(refusedHere?.id ?? 0, refusedHere !== undefined);

  // "My position" = the known place nearest the demo position, as in the search.
  const here = useDemoPosition();
  const nearest = useNearestPlace(here);
  const currentPlace = useMemo(() => (nearest.data ? toChosenPlace(nearest.data) : null), [nearest.data]);
  const currentProblem = nearest.isError ? nearest.error.message : null;

  const [chosenSeats, setChosenSeats] = useState<number | null>(null);
  /** null until the passenger chooses: the link decides (no pickup in the link = "my position"). */
  const [fromCurrent, setFromCurrent] = useState<boolean | null>(null);
  const [chosenPickup, setChosenPickup] = useState<ChosenPlace | null>(null);
  const [chosenDrop, setChosenDrop] = useState<ChosenPlace | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  /** Set at the first tap, before any render: a double tap sends one request (the server refuses a second one too). */
  const sending = useRef(false);

  const maxSeats = Math.max(1, trip.data?.placesLibres ?? 1);
  const places = Math.min(chosenSeats ?? link?.places ?? 1, maxSeats);
  const usesCurrent = fromCurrent ?? !link?.priseEnCharge;
  const priseEnCharge: Lieu | null = usesCurrent ? currentPlace : (chosenPickup ?? link?.priseEnCharge ?? null);
  const depose: Lieu | null = chosenDrop ?? link?.depose ?? trip.data?.arrivee ?? null;
  const demande = useMemo<DemandeReservation | null>(
    () =>
      link && priseEnCharge && depose
        ? { trajetId: link.tripId, places, priseEnCharge: contractLieu(priseEnCharge), depose: contractLieu(depose) }
        : null,
    [link, priseEnCharge, depose, places],
  );
  const quote = useReservationQuote(demande);
  // The server's answer for these points (the old one stays while a new one comes; none while it refuses them).
  const result = quote.data && !quote.isError ? quote.data : null;
  // The road in the picker, as at home: amber, the car, "Toi" (pickup put on the path by the server).
  // Only what is left of it: from the car on (the part already driven is not drawn); not started: all of it.
  const route = useMemo(() => {
    if (!trip.data) return undefined;
    const path = trip.data.chemin;
    const car = result?.positionChauffeur ? toLngLat(result.positionChauffeur) : null;
    return {
      path: car ? path.slice(nearestPointIndex(path, car).index) : path,
      car,
      you: result ? toLngLat(result.priseEnCharge) : null,
      end: toLngLat(trip.data.arrivee),
    };
  }, [trip.data, result]);

  if (trip.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement du trajet" />
      </View>
    );
  }

  const full = trip.data !== undefined && trip.data.placesLibres < 1;
  // Already asked on this trip (left the waiting screen): show that request, never a second one.
  const current = mine.data?.find((r) => r.trajetId === link?.tripId && ACTIVE_BOOKING_STATUSES.includes(r.statut));
  /** A request is on its way: nothing here can change it any more. */
  const locked = current !== undefined;
  const openCurrent = () => {
    if (current) router.replace({ pathname: '/booking-wait/[id]', params: { id: String(current.id) } });
  };

  /*
   * Said in the picker before choosing (same walk rule as the server: spanOnPath, PICKUP_MAX_WALK_METRES); the server
   * checks again. Only the point being picked is judged against the other one.
   */
  const checkPickup = (point: LngLat): string | null => {
    if (!trip.data) return null;
    const other = depose ? toLngLat(depose) : toLngLat(trip.data.arrivee);
    const span = spanOnPath(trip.data.chemin, point, other, PICKUP_MAX_WALK_METRES);
    return span === 'from_far' || span === 'wrong_way' ? pathSpanMessage(span, PICKUP_MAX_WALK_METRES, 'pickup') : null;
  };
  const checkDrop = (point: LngLat): string | null => {
    if (!trip.data) return null;
    const other = priseEnCharge ? toLngLat(priseEnCharge) : trip.data.chemin[0];
    const span = spanOnPath(trip.data.chemin, other, point, PICKUP_MAX_WALK_METRES);
    return span === 'to_far' || span === 'wrong_way' ? pathSpanMessage(span, PICKUP_MAX_WALK_METRES, 'drop') : null;
  };
  const currentCheck = currentPlace ? checkPickup(toLngLat(currentPlace)) : null;

  const send = () => {
    if (!demande || !quote.data || sending.current) return;
    sending.current = true;
    // The points the server put on the driver's path (the back wants them within 30 m of it).
    create.mutate(
      { ...demande, priseEnCharge: quote.data.priseEnCharge, depose: quote.data.depose },
      {
        // replace: back from the waiting screen never returns to a form that would send again.
        onSuccess: (reservation) => router.replace({ pathname: '/booking-wait/[id]', params: { id: String(reservation.id) } }),
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };

  const bannerError =
    !link || trip.isError
      ? 'Ce trajet est introuvable. Reviens en arrière et choisis un autre chauffeur.'
      : full
        ? 'Ce chauffeur n’a plus de place libre. Choisis un autre chauffeur.'
        : create.error
          ? create.error.message
          : quote.isError
            ? quote.error.message
            : usesCurrent && currentProblem
              ? currentProblem
              : null;

  const pickupValue = usesCurrent ? (currentPlace ? `Ma position · ${currentPlace.libelle}` : 'Ma position…') : (priseEnCharge?.libelle ?? 'Choisir');

  return (
    <FormScreen
      title="Réserver"
      subtitle={
        trip.data ? (
          // The trip, as "N chauffeurs passent près de toi" at home, in green with a pin.
          <View style={s.tripLine} accessible accessibilityLabel={`Trajet de ${trip.data.depart.libelle} à ${trip.data.arrivee.libelle}`}>
            <Icon name="map-pin" size="sm" tone="accent" />
            <Text style={s.trip}>
              {trip.data.depart.libelle} → {trip.data.arrivee.libelle}
            </Text>
          </View>
        ) : undefined
      }
      footer={
        current ? (
          <Button label="Voir ma demande" icon="hourglass" onPress={openCurrent} />
        ) : (
          <Button
            label={places > 1 ? `Demander ${places} places` : 'Demander une place'}
            icon="check"
            loading={create.isPending}
            disabled={!quote.data || quote.isError || full || create.isSuccess}
            onPress={send}
          />
        )
      }
    >
      {current ? <Flash message="Tu as déjà une demande en cours sur ce trajet." /> : null}
      {refusedHere && !current ? (
        <Flash
          message={
            refusal.data?.motif
              ? `Ta dernière demande à ce chauffeur a été refusée. Motif : ${refusal.data.motif}`
              : 'Ta dernière demande à ce chauffeur a été refusée.'
          }
        />
      ) : null}
      {bannerError && !current ? <Flash tone="danger" message={bannerError} /> : null}

      {result ? (
        <View style={s.driverCard} accessible accessibilityLabel={`Chauffeur : ${driverSummaryLabel(result, passingWhen(result))}`}>
          <DriverSummary driver={result} when={passingWhen(result)} />
        </View>
      ) : null}

      {trip.data ? (
        <View style={s.places}>
          <PlaceField label="Prise en charge" value={pickupValue} disabled={locked} onPress={() => setPicking('pickup')} />
          <PlaceField label="Dépose" value={depose?.libelle ?? 'Choisir'} disabled={locked} onPress={() => setPicking('drop')} />
          <Text style={s.muted}>Sur son trajet, dans son sens : à {PICKUP_MAX_WALK_METRES} m au plus de sa route.</Text>
        </View>
      ) : null}

      {trip.data && !full ? (
        <Stepper
          label="Places"
          value={places}
          min={1}
          max={maxSeats}
          disabled={locked}
          hint={`Il reste ${seatsText(trip.data.placesLibres)} dans ce véhicule.`}
          onChange={setChosenSeats}
        />
      ) : null}

      {quote.data ? (
        <View
          style={s.block}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Prix total ${formatAriary(quote.data.prixTotal)}, ${formatAriary(quote.data.prixParPlace)} la place, ${formatDistance(quote.data.distanceMetres)}`}
        >
          <Text style={s.label}>{quote.isPlaceholderData ? 'Prix total · mise à jour…' : 'Prix total'}</Text>
          <Text style={s.price}>{formatAriary(quote.data.prixTotal)}</Text>
          <Text style={s.muted}>
            {formatAriary(quote.data.prixParPlace)} la place × {seatsText(places)} · {formatDistance(quote.data.distanceMetres)}
          </Text>
        </View>
      ) : quote.isPending && demande ? (
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Calcul du prix" />
      ) : null}

      <Flash message="Paiement en espèces, au chauffeur, à la montée. Rien à payer dans l’app." />

      <Text style={s.muted}>
        Le chauffeur a {ANSWER_DELAY_MINUTES} minutes pour répondre. Tu peux annuler ta demande tant qu’il n’a pas répondu.
      </Text>

      {trip.data ? (
        <>
          <PlacePicker
            visible={picking === 'pickup'}
            title="D’où pars-tu ?"
            near={priseEnCharge ?? here}
            selected={priseEnCharge ? chosen(priseEnCharge) : null}
            route={route}
            check={checkPickup}
            current={{
              place: currentCheck ? null : currentPlace,
              problem: currentProblem ?? currentCheck,
              onSelect: () => {
                setFromCurrent(true);
                setPicking(null);
              },
            }}
            onSelect={(place) => {
              setFromCurrent(false);
              setChosenPickup(place);
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
          <PlacePicker
            visible={picking === 'drop'}
            title="Où vas-tu ?"
            near={depose ?? here}
            selected={depose ? chosen(depose) : null}
            route={route}
            overview
            check={checkDrop}
            onSelect={(place) => {
              setChosenDrop(place);
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
        </>
      ) : null}
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    tripLine: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    trip: { ...typography.bodyStrong, color: colors.accent, flexShrink: 1 },
    // The home's driver card (PassingDriverRow), without its trip line.
    driverCard: { padding: spacing[3], borderRadius: radii.md, backgroundColor: colors.fill },
    block: { gap: spacing[1], padding: spacing[4], borderRadius: radii.md, backgroundColor: colors.fill },
    places: { gap: spacing[2] },
    label: { ...typography.small, color: colors.textMuted },
    muted: { ...typography.small, color: colors.textMuted },
    price: { ...typography.title, color: colors.text },
  });
