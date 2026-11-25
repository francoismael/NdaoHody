import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap, MapPoints, type MapFit, type MapPoint } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, ChoiceGroup, Icon, TextField, type ChoiceOption } from '@/shared/ui';
import { matchesSearch } from '@/shared/utils';

import type { Place } from '../types';

export type PlacePickerProps = {
  visible: boolean;
  title: string;
  places: readonly Place[];
  /** Highlighted row; `'current'` = the "my position" row. */
  selected: number | 'current' | null;
  onSelect: (placeId: number) => void;
  onClose: () => void;
  /** Departure only: a first row "Ma position" (null subtitle = no known place nearby). */
  current?: { place: Place | null; problem: string | null; onSelect: () => void };
  /** Shown when `places` is empty. */
  emptyText?: string;
};

/**
 * Chooses a place among those the server knows (LieuSelect of the PWA), on the map (touch a
 * point) or in a list (with a search). Both offer only places with a recorded road: a free
 * address or map point would have none (decision of Bloc 3; the API's routing replaces it later).
 * Android back closes it.
 */

type Mode = 'map' | 'list';

const MODES: readonly ChoiceOption<Mode>[] = [
  { value: 'map', label: 'Carte' },
  { value: 'list', label: 'Liste' },
];

/** Space around the points when the map frames them. */
const MAP_INSET = 32;
export function PlacePicker({ visible, title, places, selected, onSelect, onClose, current, emptyText }: PlacePickerProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('map');
  const [query, setQuery] = useState('');
  // On the map, a touch only points at a place; "Choisir" confirms it.
  const [pointed, setPointed] = useState<number | null>(null);
  const shown = places.filter((place) => matchesSearch(place.nom, query));
  const points = useMemo<MapPoint[]>(() => places.map((p) => ({ id: p.id, coordinate: [p.longitude, p.latitude] })), [places]);
  const fit = useMemo<MapFit | null>(
    () =>
      points.length >= 2
        ? { coordinates: points.map((p) => p.coordinate), insets: { top: MAP_INSET, bottom: MAP_INSET, left: MAP_INSET, right: MAP_INSET } }
        : null,
    [points],
  );
  const initial = selected === 'current' ? (current?.place?.id ?? null) : selected;
  const pointedPlace = places.find((p) => p.id === (pointed ?? initial)) ?? null;

  // A fresh sheet each time it opens.
  const reset = (): void => {
    setQuery('');
    setPointed(null);
  };
  const close = (): void => {
    reset();
    onClose();
  };
  const select = (placeId: number): void => {
    reset();
    onSelect(placeId);
  };
  const selectCurrent = (): void => {
    reset();
    current?.onSelect();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      {/* The modal draws under the status bar (edge-to-edge): keep its height free. */}
      <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.header}>
          <Text style={s.title} accessibilityRole="header">
            {title}
          </Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={12} style={s.close}>
            <Icon name="x" />
          </Pressable>
        </View>
        <View style={s.mode}>
          <ChoiceGroup label="Choisir sur" options={MODES} value={mode} onChange={setMode} />
        </View>

        {mode === 'map' ? (
          <>
            <View style={s.map}>
              <AppMap fit={fit}>
                <MapPoints id="place-picker" points={points} selectedId={pointedPlace?.id ?? null} onPress={setPointed} />
              </AppMap>
            </View>
            <View style={s.mapCard}>
              {places.length === 0 && emptyText ? <Text style={s.empty}>{emptyText}</Text> : null}
              <Text style={s.mapHint} accessibilityLiveRegion="polite">
                {pointedPlace ? pointedPlace.nom : 'Touche un point vert : ce sont les lieux où un trajet est enregistré.'}
              </Text>
              <Button label="Choisir ce lieu" disabled={!pointedPlace} onPress={() => pointedPlace && select(pointedPlace.id)} />
              {current?.place ? (
                <Button label={`Ma position · ${current.place.nom}`} variant="secondary" onPress={selectCurrent} />
              ) : null}
            </View>
          </>
        ) : (
          <>
            <View style={s.search}>
              <TextField
                label="Rechercher un lieu"
                value={query}
                onChangeText={setQuery}
                placeholder="Ex. Ivato, Analakely…"
                maxLength={40}
              />
            </View>
            <ScrollView contentContainerStyle={s.list} keyboardShouldPersistTaps="handled">
              {current && query.trim() === '' ? (
                <Row
                  s={s}
                  icon="current"
                  label="Ma position"
                  detail={current.place ? `Près de toi : ${current.place.nom}` : (current.problem ?? 'Recherche…')}
                  selected={selected === 'current'}
                  disabled={!current.place}
                  onPress={selectCurrent}
                />
              ) : null}
              {shown.map((place) => (
                <Row key={place.id} s={s} icon="place" label={place.nom} selected={selected === place.id} onPress={() => select(place.id)} />
              ))}
              {places.length === 0 && emptyText ? <Text style={s.empty}>{emptyText}</Text> : null}
              {places.length > 0 && shown.length === 0 ? (
                <Text style={s.empty} accessibilityLiveRegion="polite">
                  Aucun lieu « {query.trim()} » parmi ceux qui ont un trajet enregistré.
                </Text>
              ) : null}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

type RowProps = {
  s: ReturnType<typeof createStyles>;
  icon: 'current' | 'place';
  label: string;
  detail?: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Row({ s, icon, label, detail, selected, disabled = false, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [s.row, selected && s.rowSelected, pressed && s.rowPressed, disabled && s.rowDisabled]}
    >
      <View style={[s.dot, icon === 'current' && s.dotCurrent]} />
      <View style={s.rowText}>
        <Text style={[s.rowLabel, selected && s.rowLabelSelected]}>{label}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
      {selected ? <Icon name="check" tone="accent" /> : null}
    </Pressable>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing, gutter, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter, paddingVertical: spacing[4], gap: spacing[3] },
    title: { ...typography.heading, color: colors.text, flex: 1 },
    close: { padding: spacing[2], borderRadius: radii.full, backgroundColor: colors.fill },
    mode: { paddingHorizontal: gutter, paddingBottom: spacing[3] },
    map: { flex: 1 },
    mapCard: { padding: gutter, gap: spacing[3], borderTopWidth: 1, borderTopColor: colors.surfaceBorder, backgroundColor: colors.surface },
    mapHint: { ...typography.bodyStrong, color: colors.text },
    search: { paddingHorizontal: gutter, paddingBottom: spacing[3] },
    list: { paddingHorizontal: gutter, paddingBottom: spacing[6], gap: spacing[2] },
    row: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSurface },
    rowPressed: { borderColor: colors.borderStrong },
    rowDisabled: { opacity: 0.6 },
    dot: { width: 10, height: 10, borderRadius: radii.full, borderWidth: 2, borderColor: colors.accent },
    dotCurrent: { backgroundColor: colors.accent },
    rowText: { flex: 1, gap: spacing[1] },
    rowLabel: { ...typography.body, color: colors.text },
    rowLabelSelected: { fontFamily: fontFamilies.semiBold, color: colors.accent },
    rowDetail: { ...typography.small, color: colors.textMuted },
    empty: { ...typography.body, color: colors.textMuted, paddingVertical: spacing[4] },
  });
