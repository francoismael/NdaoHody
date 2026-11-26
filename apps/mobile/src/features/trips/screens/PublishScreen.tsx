import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap, PlaceLabel, RouteLine, type LngLat, type MapFit } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, FieldMessage, Flash, Icon } from '@/shared/ui';
import { formatDistance, formatDuration } from '@/shared/utils';

import { PlacePicker } from '../components/PlacePicker';
import { PublishBlockedCard } from '../components/PublishBlockedCard';
import { usePublishAccess } from '../hooks/usePublishAccess';
import { toChosenPlace, useDemoPosition, useNearestPlace, useRouteBetween } from '../hooks/useTrips';
import { encodePlace } from '../publishParams';
import { MIN_TRIP_METRES, PUBLISH_MESSAGES as M } from '../rules';
import type { ChosenPlace } from '../types';

type Picking = 'depart' | 'arrivee' | null;

/**
 * Publish, step 1 of 3: where from (my position or a searched place) and where to.
 * The road is computed on real streets (Mapbox online, recorded roads offline);
 * the driver alone sees this preview.
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
  const currentPlace = useMemo(() => (nearest.data ? toChosenPlace(nearest.data) : null), [nearest.data]);
  const [fromCurrent, setFromCurrent] = useState(true);
  const [chosenDepart, setChosenDepart] = useState<ChosenPlace | null>(null);
  const [arrivee, setArrivee] = useState<ChosenPlace | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const depart = fromCurrent ? currentPlace : chosenDepart;
  const route = useRouteBetween(depart, arrivee);
  const tooShort = route.data !== undefined && route.data.distanceMetres < MIN_TRIP_METRES;

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
          value={depart ? (fromCurrent ? `Ma position · ${depart.libelle}` : depart.libelle) : fromCurrent ? 'Ma position…' : 'Choisir'}
          onPress={() => setPicking('depart')}
        />
        {currentProblem ? <FieldMessage tone="danger" message={currentProblem} /> : null}
        <FieldRow s={s} label="Destination" value={arrivee?.libelle ?? 'Choisir'} onPress={() => setPicking('arrivee')} />

        {route.isError ? <FieldMessage tone="danger" message={route.error.message} /> : null}
        {tooShort ? <FieldMessage tone="danger" message={M.tooShort} /> : null}
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
          disabled={!route.data || !depart || !arrivee || tooShort}
          loading={route.isFetching && !route.data}
          onPress={() => {
            if (!depart || !arrivee) return;
            router.push({ pathname: '/publish-route', params: { depart: encodePlace(depart), arrivee: encodePlace(arrivee) } });
          }}
        />
      </>
    );
  })();

  return (
    <View style={s.screen}>
      <AppMap fit={fit}>
        {/* The route comes after the points (once computed): it goes under the departure dot. */}
        {route.data ? <RouteLine id="publish-preview" coordinates={route.data.chemin} belowLayerID={depart ? 'publish-depart-circle' : undefined} /> : null}
        {depart ? <PlaceLabel id="publish-depart" coordinate={[depart.longitude, depart.latitude]} label="Départ" /> : null}
        {arrivee ? <PlaceLabel id="publish-arrivee" coordinate={[arrivee.longitude, arrivee.latitude]} label="Arrivée" /> : null}
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
        near={here}
        selected={depart}
        current={{
          place: currentPlace,
          problem: nearest.isError ? nearest.error.message : null,
          onSelect: () => {
            setFromCurrent(true);
            setPicking(null);
          },
        }}
        onSelect={(place) => {
          setFromCurrent(false);
          setChosenDepart(place);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <PlacePicker
        visible={picking === 'arrivee'}
        title="Où vas-tu ?"
        near={here}
        selected={arrivee}
        onSelect={(place) => {
          setArrivee(place);
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
    // Attached to the screen edges, right on the tab bar: a sheet, like the homes.
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
      gap: spacing[3],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
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
