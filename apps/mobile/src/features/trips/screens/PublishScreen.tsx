import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap, MovingMarker, RouteLine, type LngLat, type MapFit } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, FieldMessage, Flash, Icon } from '@/shared/ui';
import { formatDistance, formatDuration } from '@/shared/utils';

import { PlacePicker } from '../components/PlacePicker';
import { PublishBlockedCard } from '../components/PublishBlockedCard';
import { usePublishAccess } from '../hooks/usePublishAccess';
import { useDemoPosition, useDestinations, useNearestPlace, usePlaces, useRoutePreview } from '../hooks/useTrips';

type Picking = 'depart' | 'arrivee' | null;

/**
 * Publish, step 1 of 3: where from (my position or a chosen place) and where to.
 * Only places with a recorded road are offered, so the route is always drawn
 * on real streets. The route is seen by the driver only (preview).
 */
export function PublishScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const access = usePublishAccess();

  // PROVISIONAL (like the passenger home, until GPS positions in R12/R22): the demo position.
  const here = useDemoPosition();
  const nearest = useNearestPlace(here);
  const places = usePlaces();
  const [fromCurrent, setFromCurrent] = useState(true);
  const [chosenDepartId, setChosenDepartId] = useState<number | null>(null);
  const [wantedArriveeId, setWantedArriveeId] = useState<number | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const departId = fromCurrent ? (nearest.data?.id ?? null) : chosenDepartId;
  const depart = fromCurrent ? (nearest.data ?? null) : (places.data?.find((p) => p.id === chosenDepartId) ?? null);
  const destinations = useDestinations(departId);
  // A destination that cannot be reached from the new departure is dropped.
  const arrivee = destinations.data?.find((p) => p.id === wantedArriveeId) ?? null;
  const route = useRoutePreview(departId, arrivee?.id ?? null);

  const fit = useMemo<MapFit | null>(() => {
    if (panelHeight === 0) return null;
    const coordinates: LngLat[] = route.data?.chemin ?? (depart ? [[depart.longitude, depart.latitude]] : []);
    if (coordinates.length < 2) return null;
    return { coordinates, insets: { top: insets.top + theme.spacing[8], bottom: panelHeight + theme.spacing[8], left: theme.gutter, right: theme.gutter } };
  }, [route.data, depart, panelHeight, insets.top, theme]);

  const currentProblem = fromCurrent && nearest.isError ? nearest.error.message : null;

  const panel = (() => {
    if (access.status === 'loading') return <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement" />;
    if (access.status === 'error') {
      return (
        <>
          <Flash tone="danger" message={access.error.message} />
          <Button label="Réessayer" icon="refresh" variant="secondary" onPress={access.retry} />
        </>
      );
    }
    if (access.status === 'blocked') return <PublishBlockedCard blocker={access.blocker} />;

    return (
      <>
        <FieldRow
          s={s}
          label="Départ"
          value={depart ? (fromCurrent ? `Ma position · ${depart.nom}` : depart.nom) : fromCurrent ? 'Ma position…' : 'Choisir'}
          onPress={() => setPicking('depart')}
        />
        {currentProblem ? <FieldMessage tone="danger" message={currentProblem} /> : null}
        <FieldRow s={s} label="Destination" value={arrivee?.nom ?? 'Choisir'} onPress={() => setPicking('arrivee')} disabled={departId === null} />

        {route.isError ? <FieldMessage tone="danger" message={route.error.message} /> : null}
        {route.data ? (
          <View style={s.summary} accessible accessibilityLiveRegion="polite">
            <Text style={s.summaryMain}>
              {formatDistance(route.data.distanceMetres)} · {formatDuration(route.data.dureeSecondes)}
            </Text>
            <Text style={s.summaryNote}>Tracé visible par toi seulement.</Text>
          </View>
        ) : null}

        <Button
          label="Continuer"
          disabled={!route.data || departId === null || !arrivee}
          loading={route.isFetching && !route.data}
          onPress={() => {
            if (departId === null || !arrivee) return;
            router.push({ pathname: '/publish-route', params: { departId: String(departId), arriveeId: String(arrivee.id) } });
          }}
        />
      </>
    );
  })();

  return (
    <View style={s.screen}>
      <AppMap fit={fit}>
        {route.data ? <RouteLine id="publish-preview" coordinates={route.data.chemin} /> : null}
        {depart ? <MovingMarker id="publish-depart" kind="place" coordinate={[depart.longitude, depart.latitude]} /> : null}
        {arrivee ? <MovingMarker id="publish-arrivee" kind="place" coordinate={[arrivee.longitude, arrivee.latitude]} /> : null}
      </AppMap>

      <View style={[s.titleBox, { top: insets.top + theme.spacing[3] }]}>
        <Text style={s.title} accessibilityRole="header">
          Publier un trajet
        </Text>
        <Text style={s.step}>Étape 1 sur 3 · le trajet</Text>
      </View>

      <View style={s.panel} onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}>
        {panel}
      </View>

      <PlacePicker
        visible={picking === 'depart'}
        title="D’où pars-tu ?"
        places={places.data ?? []}
        selected={fromCurrent ? 'current' : chosenDepartId}
        current={{
          place: nearest.data ?? null,
          problem: nearest.isError ? nearest.error.message : null,
          onSelect: () => {
            setFromCurrent(true);
            setPicking(null);
          },
        }}
        onSelect={(id) => {
          setFromCurrent(false);
          setChosenDepartId(id);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <PlacePicker
        visible={picking === 'arrivee'}
        title="Où vas-tu ?"
        places={destinations.data ?? []}
        selected={arrivee?.id ?? null}
        emptyText="Aucun trajet enregistré depuis ce départ. Choisis un autre départ."
        onSelect={(id) => {
          setWantedArriveeId(id);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </View>
  );
}

type FieldRowProps = { s: ReturnType<typeof createStyles>; label: string; value: string; onPress: () => void; disabled?: boolean };

/** A field that opens a list (looks like a TextField, behaves like a button). */
function FieldRow({ s, label, value, onPress, disabled = false }: FieldRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint="Ouvre la liste des lieux"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [s.row, pressed && s.rowPressed, disabled && s.rowDisabled]}
    >
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-right" tone="muted" />
    </Pressable>
  );
}

const createStyles = ({ colors, typography, shadows, spacing, gutter, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    titleBox: {
      position: 'absolute',
      left: gutter,
      right: gutter,
      padding: spacing[3],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    title: { ...typography.subheading, color: colors.text },
    step: { ...typography.small, color: colors.textMuted },
    panel: {
      position: 'absolute',
      left: gutter,
      right: gutter,
      bottom: spacing[4],
      padding: spacing[4],
      gap: spacing[3],
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    row: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowPressed: { borderColor: colors.borderStrong },
    rowDisabled: { opacity: 0.5 },
    rowText: { flex: 1 },
    rowLabel: { ...typography.caption, color: colors.textMuted },
    rowValue: { ...typography.bodyStrong, color: colors.text },
    summary: { gap: spacing[1] },
    summaryMain: { ...typography.subheading, color: colors.text },
    summaryNote: { ...typography.small, color: colors.textMuted },
  });
