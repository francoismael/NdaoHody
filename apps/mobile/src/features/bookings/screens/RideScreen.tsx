import type { SuiviReservation } from '@contract';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { vehicleText } from '@/features/profile';
import { EmergencyButton } from '@/features/safety';
import { AppMap, MovingMarker, MovingRoute, PlaceLabel, toLngLat, type MapFit } from '@/shared/map';
import { LIVE_REFRESH_MS } from '@/shared/query';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Button, Flash, FormScreen } from '@/shared/ui';
import { formatDistance } from '@/shared/utils';

import { RideSheet } from '../components/RideSheet';
import { useReservationTracking } from '../hooks/useBookings';

/** What the passenger reads first, from the server's numbers only (no distance or time computed here). */
function headline({ reservation, chauffeur, arriveeDansMinutes, distanceMetres }: SuiviReservation): { title: string; detail: string } {
  const name = chauffeur.prenom;
  if (reservation.statut === 'en_course') return { title: 'Course en cours', detail: `Bonne route avec ${name} !` };
  if (reservation.statut === 'chauffeur_sur_place') return { title: `${name} est là`, detail: 'Rejoins-le au point de prise en charge.' };
  // The server rounds up; 0 = the car is at the pickup point (simulated engine) but has not said "I am here" yet.
  if (arriveeDansMinutes <= 0) return { title: `${name} est presque là`, detail: 'Il arrive au point de prise en charge.' };
  return { title: `${name} arrive dans ${arriveeDansMinutes} min`, detail: `À ${formatDistance(distanceMetres)} de ta prise en charge` };
}

/**
 * The passenger follows his driver (block 9). Only READS the server's tracking
 * (GET /reservations/:id/tracking, every 5 s): car, road to the pickup point, minutes and distance.
 */
export function RideScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { spacing, gutter } = theme;
  const { id } = useLocalSearchParams<{ id: string }>();
  const tracking = useReservationTracking(Number(id));
  const data = tracking.data;
  const [panelHeight, setPanelHeight] = useState(0);

  // Camera: frames the road once per step (approach, on site, ride) or panel size, never at each 5 s push.
  const frameKey = `${data?.reservation.statut ?? ''}|${panelHeight}`;
  const [frame, setFrame] = useState<{ key: string; fit: MapFit | null }>({ key: '', fit: null });
  if (data && panelHeight > 0 && frame.key !== frameKey) {
    const target = data.reservation.statut === 'en_course' ? data.reservation.depose : data.reservation.priseEnCharge;
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
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de ta course" />
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

  const { reservation, chauffeur, vehicule } = data;
  const onBoard = reservation.statut === 'en_course';
  const { title, detail } = headline(data);

  return (
    <View style={s.container}>
      <AppMap fit={frame.fit}>
        {/* Route first, points after, in the same render: the points stay on top. */}
        <MovingRoute id="ride-to-pickup" from={toLngLat(data.positionChauffeur)} path={data.cheminVersPassager} glideMs={LIVE_REFRESH_MS} />
        {onBoard ? (
          <PlaceLabel id="ride-drop" coordinate={toLngLat(reservation.depose)} label="Dépose" />
        ) : (
          <PlaceLabel id="ride-pickup" coordinate={toLngLat(reservation.priseEnCharge)} label="Prise en charge" />
        )}
        <MovingMarker id="ride-car" coordinate={toLngLat(data.positionChauffeur)} glideMs={LIVE_REFRESH_MS} highlighted />
      </AppMap>

      <EmergencyButton />

      <RideSheet onHeight={setPanelHeight}>
        <View style={s.block} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${title}. ${detail}`}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.detail}>{detail}</Text>
        </View>
        <View style={s.driver} accessible accessibilityLabel={`${chauffeur.prenom}, ${vehicleText(vehicule)}, plaque ${vehicule.immatriculation}`}>
          <Avatar name={chauffeur.prenom} photoUrl={chauffeur.photoUrl} />
          <View style={s.driverText}>
            <Text style={s.name}>{chauffeur.prenom}</Text>
            <Text style={s.muted}>{vehicleText(vehicule)}</Text>
          </View>
          <Text style={s.plate}>{vehicule.immatriculation}</Text>
        </View>
        <Text style={s.muted}>
          {onBoard ? `Dépose : ${reservation.depose.libelle}` : `Prise en charge : ${reservation.priseEnCharge.libelle}`}
        </Text>
        {tracking.isError ? <Flash tone="danger" message={tracking.error.message} /> : null}
      </RideSheet>
    </View>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    block: { gap: spacing[1] },
    title: { ...typography.heading, color: colors.text },
    detail: { ...typography.body, color: colors.accent },
    driver: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    driverText: { flex: 1, gap: spacing[1] },
    name: { ...typography.bodyStrong, color: colors.text },
    muted: { ...typography.small, color: colors.textMuted },
    plate: { ...typography.small, fontFamily: fontFamilies.semiBold, color: colors.text },
  });
