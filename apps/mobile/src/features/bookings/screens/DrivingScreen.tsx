import type { SuiviReservation } from '@contract';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmergencyButton } from '@/features/safety';
import { AppMap, MovingMarker, MovingRoute, PlaceLabel, RouteLine, nearestPointIndex, toLngLat, type LngLat, type MapFit } from '@/shared/map';
import { LIVE_REFRESH_MS } from '@/shared/query';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Button, Flash, FormScreen } from '@/shared/ui';
import { formatAriary, formatDistance } from '@/shared/utils';

import { RideSheet } from '../components/RideSheet';
import { useReservationTracking } from '../hooks/useBookings';

const placesText = (n: number): string => (n > 1 ? `${n} places` : '1 place');

/** What the driver reads first, from the server's numbers only. */
function headline({ reservation, passager, arriveeDansMinutes, distanceMetres }: SuiviReservation): { title: string; detail: string } {
  const name = passager.prenom;
  if (reservation.statut === 'en_course') return { title: 'Course en cours', detail: `Dépose de ${name} : ${reservation.depose.libelle}` };
  if (reservation.statut === 'chauffeur_sur_place') return { title: 'Tu es sur place', detail: `${name} te rejoint au point de prise en charge.` };
  if (arriveeDansMinutes <= 0) return { title: `Tu arrives chez ${name}`, detail: `À ${formatDistance(distanceMetres)} de la prise en charge` };
  return { title: `Va chercher ${name}`, detail: `Dans ${arriveeDansMinutes} min · à ${formatDistance(distanceMetres)}` };
}

/**
 * The driver goes to pick his passenger up (block 9), `[id]` = the reservation. Only READS the server's
 * tracking (every 5 s). Only what is useful (like Uber): the pickup dominates (road to the passenger,
 * camera on it); his destination stays visible as a label, with the rest of his road after the pickup.
 */
export function DrivingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { spacing, gutter } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const tracking = useReservationTracking(Number(id));
  const data = tracking.data;
  const [panelHeight, setPanelHeight] = useState(0);

  const onBoard = data?.reservation.statut === 'en_course';
  // The rest of his road: from the pickup point (approach) or from the car (passenger on board).
  // Keyed on numbers: the tracking is a new object every 5 s.
  const chemin = data?.trajet.chemin;
  const anchor = data ? (onBoard ? data.positionChauffeur : data.reservation.priseEnCharge) : null;
  const anchorLng = anchor?.longitude ?? null;
  const anchorLat = anchor?.latitude ?? null;
  const onward = useMemo<LngLat[]>(() => {
    if (!chemin || anchorLng === null || anchorLat === null) return [];
    return chemin.slice(nearestPointIndex(chemin, [anchorLng, anchorLat]).index);
  }, [chemin, anchorLng, anchorLat]);

  // Camera: the car and the point he is going to, framed once per step (or panel size).
  const frameKey = `${data?.reservation.statut ?? ''}|${panelHeight}`;
  const [frame, setFrame] = useState<{ key: string; fit: MapFit | null }>({ key: '', fit: null });
  if (data && panelHeight > 0 && frame.key !== frameKey) {
    const target = onBoard ? data.reservation.depose : data.reservation.priseEnCharge;
    setFrame({
      key: frameKey,
      fit: {
        coordinates: [toLngLat(data.positionChauffeur), toLngLat(target), ...data.cheminVersPassager],
        insets: { top: spacing[10], bottom: panelHeight + spacing[8], left: gutter, right: gutter },
      },
    });
  }

  if (tracking.isPending) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de la course" />
      </View>
    );
  }

  if (!data) {
    return (
      <FormScreen title="Suivi indisponible" footer={<Button label="Retour à l’accueil" icon="arrow-left" variant="secondary" onPress={() => router.replace('/')} />}>
        <Flash tone="danger" message={tracking.error?.message ?? 'Cette course n’est plus suivie.'} />
      </FormScreen>
    );
  }

  const { reservation, passager, trajet } = data;
  const { title, detail } = headline(data);

  return (
    <View style={s.container}>
      <AppMap fit={frame.fit}>
        {/* Roads first, points after, in the same render: the points stay on top. */}
        {/* On board, the rest of his road starts at the car: its start follows the drawn car. */}
        {onBoard ? (
          <MovingRoute id="driving-onward" from={toLngLat(data.positionChauffeur)} path={onward} glideMs={LIVE_REFRESH_MS} />
        ) : (
          <RouteLine id="driving-onward" coordinates={onward} />
        )}
        <MovingRoute id="driving-to-pickup" from={toLngLat(data.positionChauffeur)} path={data.cheminVersPassager} glideMs={LIVE_REFRESH_MS} />
        <PlaceLabel id="driving-end" coordinate={toLngLat(trajet.arrivee)} label="Ta destination" tone="onward" />
        {onBoard ? (
          <PlaceLabel id="driving-drop" coordinate={toLngLat(reservation.depose)} label="Dépose" />
        ) : (
          <PlaceLabel id="driving-pickup" coordinate={toLngLat(reservation.priseEnCharge)} label="Prise en charge" />
        )}
        <MovingMarker id="driving-car" coordinate={toLngLat(data.positionChauffeur)} glideMs={LIVE_REFRESH_MS} highlighted />
      </AppMap>

      <EmergencyButton />

      <RideSheet onHeight={setPanelHeight}>
        <View style={s.block} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${title}. ${detail}`}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.detail}>{detail}</Text>
        </View>
        <View
          style={s.passenger}
          accessible
          accessibilityLabel={`${passager.prenom}, ${placesText(reservation.places)}, ${formatAriary(reservation.prixTotal)} en espèces`}
        >
          <Avatar name={passager.prenom} photoUrl={passager.photoUrl} />
          <View style={s.passengerText}>
            <Text style={s.name}>{passager.prenom}</Text>
            <Text style={s.muted}>
              {placesText(reservation.places)} · {formatAriary(reservation.prixTotal)} en espèces
            </Text>
          </View>
        </View>
        <View style={s.lines}>
          <Text style={s.muted}>{onBoard ? `Dépose : ${reservation.depose.libelle}` : `Prise en charge : ${reservation.priseEnCharge.libelle}`}</Text>
          <Text style={s.muted}>Ta destination : {trajet.arrivee.libelle}</Text>
        </View>
        {tracking.isError ? <Flash tone="danger" message={tracking.error.message} /> : null}
      </RideSheet>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    block: { gap: spacing[1] },
    title: { ...typography.heading, color: colors.text },
    detail: { ...typography.body, color: colors.accent },
    passenger: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    passengerText: { flex: 1, gap: spacing[1] },
    name: { ...typography.bodyStrong, color: colors.text },
    muted: { ...typography.small, color: colors.textMuted },
    lines: { gap: spacing[1] },
  });
