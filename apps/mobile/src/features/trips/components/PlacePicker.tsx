import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Position } from '@contract';

import { AppMap, MovingMarker, PlaceLabel, RouteLine, newSearchSession, type LngLat, type MapFit, type MapFocus } from '@/shared/map';
import { LIVE_REFRESH_MS } from '@/shared/query';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, FieldMessage, Icon, TextField } from '@/shared/ui';
import { formatDistance, formatDuration, useDebouncedValue } from '@/shared/utils';

import { PLACE_SEARCH_MIN_CHARS, usePlaceAt, usePlaceSearch, useResolvePlace, useRouteBetween } from '../hooks/useTrips';
import { PUBLISH_MESSAGES as M } from '../rules';
import type { ChosenPlace, PlaceSuggestionItem } from '../types';

/** Wait this long after the last key before asking Mapbox (fewer requests, same feel). */
const SEARCH_DEBOUNCE_MS = 300;
const FOUND_ZOOM = 15;
const CITY_ZOOM = 12;
/** Opening: rises and fades in, decelerating (ease-out). Closing is a little quicker (ease-in). */
const OPEN_MS = 420;
const CLOSE_MS = 300;
/** How far below its place the sheet starts, as a share of the screen height. */
const RISE_SHARE = 0.12;

/**
 * Keeps the sheet on screen while it animates out, and drives one 0 → 1 value
 * (built-in Animated, native driver: no library, no rebuild). Reduced motion: no movement.
 * `opening`: changes at each opening (fresh content).
 */
function useSheetTransition(visible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (visible) {
      setMounted(true);
      setOpening((n) => n + 1);
    }
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      Animated.timing(progress, {
        toValue: visible ? 1 : 0,
        duration: reduced ? 0 : visible ? OPEN_MS : CLOSE_MS,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !visible && !cancelled) setMounted(false);
      });
    });
    return () => {
      cancelled = true;
      progress.stopAnimation();
    };
  }, [visible, progress]);

  return { mounted, progress, opening };
}

export type PlacePickerProps = {
  visible: boolean;
  title: string;
  /** Suggestions near this point first (the demo position, in Tana). */
  near: Position;
  /** The place already chosen, shown on the map when the sheet opens. */
  selected: ChosenPlace | null;
  onSelect: (place: ChosenPlace) => void;
  onClose: () => void;
  /** Departure only: "my position" as a shortcut (null place = no known place nearby). */
  current?: { place: ChosenPlace | null; problem: string | null; onSelect: () => void };
  /** Booking: the driver's road under the point (amber, as at home), his car, "Toi" and his destination. */
  route?: { path: LngLat[]; car: LngLat | null; you: LngLat | null; end: LngLat };
  /** Booking: why a touched or found point cannot be chosen (said at once; "Choisir ce lieu" stays off). */
  check?: (point: LngLat) => string | null;
  /** With `route` (booking drop): opens on "Toi" and the driver's destination together; a touched or found point is then zoomed in. */
  overview?: boolean;
  /**
   * Publish destination: the departure, shown from the opening. A touched or found point gets the road
   * from it (amber, "Départ" → "Arrivée") and a summary. No distance-to-road check for the driver (28/11).
   */
  from?: ChosenPlace | null;
};

/**
 * Search a place by name with suggestions (Mapbox Search Box), or touch the map to drop a
 * point (named after what is there); see it on the map, choose it.
 * Offline, the suggestions fall back to the known places. Android back closes the sheet.
 */
export function PlacePicker({ visible, onClose, ...content }: PlacePickerProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mounted, progress, opening } = useSheetTransition(visible);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {/* The publish screen stays visible behind, slowly dimmed: the eye keeps its place. */}
      <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: progress }]} />
      {/* The modal draws under the status bar (edge-to-edge): keep its height free. */}
      <Animated.View
        style={[
          s.screen,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height * RISE_SHARE, 0] }) }],
          },
        ]}
      >
        {/* A new key at each opening: fresh search; while closing, the content stays as it was. */}
        <PickerContent key={opening} {...content} onClose={onClose} />
      </Animated.View>
    </Modal>
  );
}

type PickerContentProps = Omit<PlacePickerProps, 'visible'>;

function PickerContent({ title, near, selected, onSelect, onClose, current, route, check, overview = false, from = null }: PickerContentProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);

  // One Mapbox session per opening: from the first key to the chosen place.
  const [sessionToken] = useState(newSearchSession);
  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(true);
  const [pointed, setPointed] = useState<ChosenPlace | null>(null);
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const search = usePlaceSearch(debounced, sessionToken, near);
  const resolve = useResolvePlace();
  const placeAt = usePlaceAt();
  const busy = resolve.isPending || placeAt.isPending;

  const shown = pointed ?? selected;
  // Opening on the departure (publish destination): the driver sees where he leaves from first.
  const focus = useMemo<MapFocus>(
    () =>
      shown
        ? { coordinate: [shown.longitude, shown.latitude], zoom: FOUND_ZOOM }
        : from
          ? { coordinate: [from.longitude, from.latitude], zoom: FOUND_ZOOM }
          : { coordinate: [near.longitude, near.latitude], zoom: CITY_ZOOM },
    [shown, from, near],
  );

  // Publish destination: the road from the departure to the shown point. Same cache key as the
  // publish screen (numbers only): the road is not asked again once the place is chosen.
  const preview = useRouteBetween(from, from ? shown : null);
  const roadShown = from && shown ? (preview.data ?? null) : null;
  const [summaryHeight, setSummaryHeight] = useState(0);
  // Booking drop, until a point is touched or found: "Toi", the driver's destination and the
  // chosen place all in view. Keyed on the numbers: the route and the selected place are new objects at each
  // refresh (the car moves), and a new fit would bring the camera back while the user moves the map.
  const { spacing } = theme;
  const [endLng, endLat] = route?.end ?? [null, null];
  const [youLng, youLat] = route?.you ?? [null, null];
  const selLng = selected?.longitude ?? null;
  const selLat = selected?.latitude ?? null;
  const roadPath = roadShown?.chemin;
  const fit = useMemo<MapFit | null>(() => {
    // The whole road in view, above the summary (room on top for the bubbles).
    if (roadPath) return { coordinates: roadPath, insets: { top: spacing[10] + spacing[6], bottom: summaryHeight + spacing[6], left: spacing[10], right: spacing[10] } };
    if (!overview || pointed || endLng === null || endLat === null) return null;
    const points: LngLat[] = [[endLng, endLat]];
    if (youLng !== null && youLat !== null) points.push([youLng, youLat]);
    if (selLng !== null && selLat !== null) points.push([selLng, selLat]);
    // Room above for the bubbles ("Destination du chauffeur" is the widest).
    return { coordinates: points, insets: { top: spacing[10] + spacing[6], bottom: spacing[8], left: spacing[10], right: spacing[10] } };
  }, [roadPath, summaryHeight, overview, pointed, endLng, endLat, youLng, youLat, selLng, selLat, spacing]);
  const checked = pointed && check ? check([pointed.longitude, pointed.latitude]) : null;
  const roadProblem = from && pointed && preview.isError ? preview.error.message : null;
  const problem = checked ?? roadProblem;
  const typed = debounced.trim().length >= PLACE_SEARCH_MIN_CHARS;
  const showList = listOpen && typed;

  // Nothing is reset on the way out: the sheet leaves exactly as it was seen.
  const close = (): void => {
    Keyboard.dismiss();
    onClose();
  };
  const choose = (place: ChosenPlace): void => {
    Keyboard.dismiss();
    onSelect(place);
  };
  const pick = (item: PlaceSuggestionItem): void => {
    Keyboard.dismiss();
    setListOpen(false);
    placeAt.reset();
    resolve.mutate({ item, sessionToken }, { onSuccess: setPointed });
  };
  /** A touch on the map: the point shows at once, its name follows (the last touch wins). */
  const drop = (coordinate: LngLat): void => {
    Keyboard.dismiss();
    setListOpen(false);
    resolve.reset();
    const [longitude, latitude] = coordinate;
    setPointed({ libelle: '', longitude, latitude, placeId: null });
    placeAt.mutate(coordinate, {
      onSuccess: (place) =>
        setPointed((now) => (now && now.longitude === longitude && now.latitude === latitude ? place : now)),
    });
  };

  return (
    <>
        <View style={s.header}>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={12} style={s.close}>
            <Icon name="x" />
          </Pressable>
        </View>

        <View style={s.search}>
          <TextField
            label="Recherche un lieu ou touche la carte"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setListOpen(true);
            }}
            placeholder="Ex. Analakely, Ivato, Ankorondrano…"
            icon="search"
            maxLength={80}
            autoFocus={selected === null}
          />
          {resolve.isError ? <FieldMessage tone="danger" message={M.placeUnavailable} /> : null}
        </View>

        <View style={s.body}>
          {/* Moves and fades with the sheet (TextureView on Android). */}
          <AppMap fit={fit} focus={focus} onPress={drop} insideAnimation>
            {/* Mounted first: the car and the chosen point are drawn above the road. */}
            {route ? <RouteLine id="place-picker-route" coordinates={route.path} /> : null}
            {route ? <PlaceLabel id="place-picker-end" coordinate={route.end} label="Destination du chauffeur" tone="onward" /> : null}
            {route?.you ? <PlaceLabel id="place-picker-you" coordinate={route.you} label="Toi" /> : null}
            {route?.car ? <MovingMarker id="place-picker-car" coordinate={route.car} glideMs={LIVE_REFRESH_MS} /> : null}
            {roadShown ? <RouteLine id="place-picker-road" coordinates={roadShown.chemin} belowLayerID="place-picker-from-circle" /> : null}
            {from ? <PlaceLabel id="place-picker-from" coordinate={[from.longitude, from.latitude]} label="Départ" /> : null}
            {from && shown ? (
              <PlaceLabel id="place-picker-to" coordinate={[shown.longitude, shown.latitude]} label="Arrivée" />
            ) : shown ? (
              <MovingMarker id="place-picker-point" kind="place" coordinate={[shown.longitude, shown.latitude]} />
            ) : null}
          </AppMap>

          {/* Publish destination: the road's summary, attached to the bottom of the map like the homes' sheet. */}
          {from && shown && !preview.isError ? (
            <View style={s.summary} onLayout={(event) => setSummaryHeight(event.nativeEvent.layout.height)} accessible accessibilityLiveRegion="polite">
              {roadShown ? (
                <>
                  <Text style={s.summaryRoute} numberOfLines={2}>
                    {from.libelle} → {shown.libelle || '…'}
                  </Text>
                  <Text style={s.summaryMeta}>
                    {formatDistance(roadShown.distanceMetres)} · {formatDuration(roadShown.dureeSecondes)}
                  </Text>
                </>
              ) : (
                <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Calcul du trajet" />
              )}
            </View>
          ) : null}

          {showList ? (
            <View style={s.suggestions}>
              {search.offline ? <Text style={s.note}>{M.searchOffline}</Text> : null}
              <ScrollView keyboardShouldPersistTaps="handled" style={s.suggestionList}>
                {search.items.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => pick(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.detail ? `${item.name}, ${item.detail}` : item.name}
                    style={({ pressed }) => [s.suggestion, pressed && s.suggestionPressed]}
                  >
                    <Text style={s.suggestionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.detail ? (
                      <Text style={s.suggestionDetail} numberOfLines={1}>
                        {item.detail}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
                {search.items.length === 0 && !search.searching ? (
                  <Text style={s.note} accessibilityLiveRegion="polite">
                    Aucun lieu trouvé pour « {debounced.trim()} ».
                  </Text>
                ) : null}
              </ScrollView>
              {search.searching ? <ActivityIndicator style={s.spinner} color={theme.colors.accent} accessibilityLabel="Recherche" /> : null}
            </View>
          ) : null}
        </View>

        <View style={s.card}>
          {busy ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Recherche du nom du lieu" />
          ) : (
            <View style={s.cardPlace}>
              {shown ? <Icon name="map-pin" size="sm" tone="accent" /> : null}
              <Text style={s.cardText} accessibilityLiveRegion="polite" numberOfLines={2}>
                {shown ? shown.libelle : 'Tape le nom d’un lieu ou touche la carte.'}
              </Text>
            </View>
          )}
          {problem ? <FieldMessage tone="danger" message={problem} /> : null}
          <Button
            label="Choisir ce lieu"
            disabled={!pointed || busy || problem !== null || (from !== null && !roadShown)}
            onPress={() => pointed && choose(pointed)}
          />
          {current?.place ? (
            <Button
              label={`Ma position · ${current.place.libelle}`}
              variant="secondary"
              onPress={() => {
                Keyboard.dismiss();
                current.onSelect();
              }}
            />
          ) : current?.problem ? (
            <FieldMessage tone="muted" message={current.problem} />
          ) : null}
        </View>
    </>
  );
}

const createStyles = ({ colors, typography, shadows, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    backdrop: { backgroundColor: colors.overlay },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, paddingVertical: spacing[4], gap: spacing[3] },
    title: { ...typography.heading, color: colors.text, flex: 1 },
    close: { padding: spacing[2], borderRadius: radii.full, backgroundColor: colors.fill },
    search: { paddingHorizontal: gutter, paddingBottom: spacing[3], gap: spacing[2] },
    body: { flex: 1 },
    suggestions: {
      position: 'absolute',
      top: spacing[2],
      left: gutter,
      right: gutter,
      maxHeight: '75%',
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
      overflow: 'hidden',
    },
    suggestionList: { flexGrow: 0 },
    suggestion: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[1], borderBottomWidth: 1, borderBottomColor: colors.border },
    suggestionPressed: { backgroundColor: colors.fill },
    suggestionName: { ...typography.bodyStrong, color: colors.text },
    suggestionDetail: { ...typography.small, color: colors.textMuted },
    note: { ...typography.small, color: colors.textMuted, padding: spacing[4] },
    spinner: { padding: spacing[3] },
    // Like the homes' panel: attached to the edges, rounded top corners and a top border.
    summary: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      gap: spacing[1],
      paddingHorizontal: gutter,
      paddingVertical: spacing[3],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    summaryRoute: { ...typography.bodyStrong, color: colors.text },
    summaryMeta: { ...typography.small, color: colors.textMuted },
    card: { padding: gutter, gap: spacing[3], borderTopWidth: 1, borderTopColor: colors.surfaceBorder, backgroundColor: colors.surface },
    // Pin + name centered together; a long name wraps, still centered.
    cardPlace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
    cardText: { ...typography.bodyStrong, color: colors.text, textAlign: 'center', flexShrink: 1 },
  });
