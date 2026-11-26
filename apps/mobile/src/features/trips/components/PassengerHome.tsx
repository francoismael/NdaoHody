import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap, MovingMarker, PlaceLabel, RouteLine, type LngLat, type MapFit, type MapFocus } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Icon, smoothScrollTo, stopSmoothScroll } from '@/shared/ui';
import { formatDuration } from '@/shared/utils';

import type { LocationState } from '../hooks/useLocationIssue';
import { useDemoPosition, useTripsAround } from '../hooks/useTrips';
import type { PassingDriver } from '../types';
import { LocationPrompt } from './LocationPrompt';
import { PassingDriverRow } from './PassingDriverRow';

/** The list never takes more than this share of the screen: the passenger's point stays visible. */
const LIST_MAX_SHARE = 0.38;
/** Zoom on the passenger when no driver is around. */
const ALONE_ZOOM = 15;

const toLngLat = ({ longitude, latitude }: { longitude: number; latitude: number }): LngLat => [longitude, latitude];

function summary(drivers: readonly PassingDriver[]): { title: string; detail: string | null } {
  if (drivers.length === 0) return { title: 'Aucun chauffeur près de toi', detail: null };
  const title = drivers.length > 1 ? `${drivers.length} chauffeurs passent près de toi` : '1 chauffeur passe près de toi';
  return { title, detail: `Le prochain dans ${formatDuration(drivers[0].arriveeDansMinutes * 60)}` };
}

/**
 * Passenger home: the map and a fixed panel that folds. Drivers come from the server
 * (GET /trips/around: matched, soonest first); the screen only shows them, in that order,
 * with the same rank on the map and in the list.
 */
export function PassengerHome({ located, checking, issue }: LocationState) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { spacing, gutter } = theme;

  // Agreed rule (block 4): the GPS permission decides what is shown; the demo position gives the point.
  const here = useDemoPosition();
  const around = useTripsAround(located ? here : null);
  const drivers = useMemo(() => (located ? (around.data ?? []) : []), [located, around.data]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [open, setOpen] = useState(true);
  const [panelHeight, setPanelHeight] = useState(0);
  // A driver who has passed the passenger leaves the list: the selection then disappears too.
  const selected = drivers.find((d) => d.trajet.id === selectedId) ?? null;
  const selectedRank = selected ? drivers.indexOf(selected) + 1 : 0;

  // Camera: frames again only when the list, the selection or the panel changes,
  // never at each 5 s position push (React "adjust state when a prop changes" pattern).
  const frameKey = `${selected?.trajet.id ?? 'all'}|${drivers.map((d) => d.trajet.id).join(',')}|${panelHeight}`;
  const [frame, setFrame] = useState<{ key: string; fit: MapFit | null }>({ key: '', fit: null });
  if (panelHeight > 0 && frame.key !== frameKey) {
    const points: LngLat[] = selected
      ? [toLngLat(here), ...selected.cheminVersPassager, ...selected.cheminApresPassager]
      : drivers.length > 0
        ? [toLngLat(here), ...drivers.map((d) => toLngLat(d.positionChauffeur))]
        : [];
    setFrame({
      key: frameKey,
      fit: points.length > 0 ? { coordinates: points, insets: { top: insets.top + spacing[10] * 2, bottom: panelHeight + spacing[8], left: gutter, right: gutter } } : null,
    });
  }
  const focus = useMemo<MapFocus>(() => ({ coordinate: [here.longitude, here.latitude], zoom: ALONE_ZOOM }), [here.longitude, here.latitude]);

  // A chosen card glides to the middle of the list, once it has grown (full texts + button).
  const list = useRef<ScrollViewInstance>(null);
  const listY = useRef(0);
  const listHeight = useRef(0);
  const contentHeight = useRef(0);
  const rows = useRef(new Map<number, { y: number; height: number }>());
  const centerOn = useRef<number | null>(null);
  const stopScroll = useRef<(() => void) | null>(null);
  const stopGlide = (): void => stopSmoothScroll(stopScroll);
  useEffect(() => () => stopSmoothScroll(stopScroll), []);

  const centerRow = (id: number): void => {
    const row = rows.current.get(id);
    const area = list.current;
    if (!row || !area || centerOn.current !== id) return;
    centerOn.current = null;
    const max = Math.max(0, contentHeight.current - listHeight.current);
    const to = Math.min(max, Math.max(0, row.y + row.height / 2 - listHeight.current / 2));
    stopGlide();
    void smoothScrollTo(area, listY.current, to).then((stop) => {
      stopScroll.current = stop;
    });
  };
  const onRowLayout = (id: number, y: number, rowHeight: number): void => {
    rows.current.set(id, { y, height: rowHeight });
    // Next frame: the other cards (the one that shrank) have their new place too.
    if (centerOn.current === id) requestAnimationFrame(() => centerRow(id));
  };
  const select = (id: number): void => {
    const next = selectedId === id ? null : id;
    centerOn.current = next;
    setSelectedId(next);
  };

  const book = (driver: PassingDriver) => router.push({ pathname: '/book/[id]', params: { id: String(driver.trajet.id) } });
  const search = () => router.push('/search');
  const { title, detail } = summary(drivers);

  return (
    <View style={s.container}>
      <AppMap showUserLocation={located} fit={frame.fit} focus={focus}>
        <PlaceLabel id="passenger" coordinate={toLngLat(here)} label="Toi" />
        {/* A chosen driver alone on the map: the others are hidden until the choice is undone. */}
        {selected
          ? null
          : drivers.map((driver, i) => (
              <MovingMarker
                key={driver.trajet.id}
                id={`driver-${driver.trajet.id}`}
                coordinate={toLngLat(driver.positionChauffeur)}
                glideMs={5000}
                label={String(i + 1)}
              />
            ))}
        {/*
          Chosen driver, alone and on top. On Mapbox the last layer added is drawn
          on top, and a layer keeps its place once added: so what must be in front is mounted
          when chosen, after the rest, in this order. His road on to his destination (onward),
          his road to the passenger (green), the arrival, then his point and the
          passenger's dot again (ids per driver: choosing another one mounts new layers on top).
        */}
        {selected ? <RouteLine id="after-passenger" coordinates={selected.cheminApresPassager} tone="onward" /> : null}
        {selected ? <RouteLine id="to-passenger" coordinates={selected.cheminVersPassager} /> : null}
        {selected ? <PlaceLabel id="driver-arrival" coordinate={toLngLat(selected.trajet.arrivee)} label="Arrivée" tone="onward" /> : null}
        {selected ? (
          <MovingMarker
            key={`chosen-${selected.trajet.id}`}
            id={`chosen-driver-${selected.trajet.id}`}
            coordinate={toLngLat(selected.positionChauffeur)}
            glideMs={5000}
            label={String(selectedRank)}
            highlighted
          />
        ) : null}
        {selected ? <MovingMarker key={`chosen-here-${selected.trajet.id}`} id={`chosen-here-${selected.trajet.id}`} coordinate={toLngLat(here)} kind="place" /> : null}
      </AppMap>

      {issue ? (
        // No position: a card in the middle of the map, no list (drivers need the passenger's point).
        <View style={s.promptArea} pointerEvents="box-none">
          <LocationPrompt issue={issue}>
            <Button label="Rechercher un trajet" icon="search" variant="secondary" onPress={search} />
          </LocationPrompt>
        </View>
      ) : (
        <View style={s.panel} onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}>
          {checking ? (
            <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement" />
          ) : around.isPending ? (
            <View style={s.loading}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={s.muted}>Recherche des chauffeurs proches…</Text>
            </View>
          ) : around.isError && drivers.length === 0 ? (
            <View style={s.block}>
              <Flash tone="danger" message={around.error.message} />
              <Button label="Réessayer" icon="refresh" variant="secondary" onPress={() => void around.refetch()} />
              <Button label="Rechercher un trajet" icon="search" variant="secondary" onPress={search} />
            </View>
          ) : (
            <View style={s.block}>
              <Pressable
                style={s.head}
                onPress={() => setOpen((value) => !value)}
                disabled={drivers.length === 0}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={detail ? `${title}. ${detail}` : title}
                accessibilityHint={drivers.length === 0 ? undefined : open ? 'Réduit la liste' : 'Affiche la liste'}
              >
                <View style={s.headText}>
                  <Text style={s.title}>{title}</Text>
                  {detail ? <Text style={s.detail}>{detail}</Text> : null}
                </View>
                {drivers.length > 0 ? (
                  <View style={open ? s.chevronOpen : s.chevronClosed}>
                    <Icon name="chevron-right" tone="muted" />
                  </View>
                ) : null}
              </Pressable>

              {drivers.length === 0 ? (
                <Text style={s.muted}>Aucun chauffeur en route ne passe près de toi pour l’instant. Lance une recherche pour voir aussi les trajets prévus.</Text>
              ) : open ? (
                <ScrollView
                  ref={list}
                  style={{ maxHeight: height * LIST_MAX_SHARE }}
                  contentContainerStyle={s.list}
                  onLayout={(event) => {
                    listHeight.current = event.nativeEvent.layout.height;
                  }}
                  onContentSizeChange={(_width, contentH) => {
                    contentHeight.current = contentH;
                  }}
                  onScroll={(event) => {
                    listY.current = event.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  onScrollBeginDrag={stopGlide}
                >
                  {drivers.map((driver, i) => (
                    <View key={driver.trajet.id} onLayout={(event) => onRowLayout(driver.trajet.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}>
                      <PassingDriverRow
                        driver={driver}
                        rank={i + 1}
                        selected={driver.trajet.id === selectedId}
                        when={{ label: 'passe dans', value: formatDuration(driver.arriveeDansMinutes * 60) }}
                        onSelect={() => select(driver.trajet.id)}
                        actions={<Button label="Réserver une place" onPress={() => book(driver)} />}
                      />
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <Button label="Rechercher un trajet" icon="search" variant={drivers.length === 0 ? 'primary' : 'secondary'} onPress={search} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Attached to the screen edges, right on the tab bar: a sheet, not a floating card.
    panel: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: gutter,
      paddingVertical: spacing[4],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    promptArea: { ...StyleSheet.absoluteFill, justifyContent: 'center', paddingHorizontal: gutter },
    block: { gap: spacing[3] },
    loading: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    headText: { flex: 1, gap: spacing[1] },
    title: { ...typography.heading, color: colors.text },
    detail: { ...typography.bodyStrong, color: colors.accent },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    chevronClosed: { transform: [{ rotate: '-90deg' }] },
    list: { gap: spacing[2] },
    muted: { ...typography.small, color: colors.textMuted },
  });
