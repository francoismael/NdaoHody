import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DemandeRecherche, ResultatRecherche } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Icon } from '@/shared/ui';
import {
  currentTime,
  currentTimeMs,
  formatAriary,
  formatDay,
  formatDayTime,
  formatDistance,
  formatDuration,
  formatTime,
  toIsoWithOffset,
} from '@/shared/utils';

import { nextQuarter } from '../components/DepartureTimePicker';
import { PassingDriverRow } from '../components/PassingDriverRow';
import { SearchForm } from '../components/SearchForm';
import { useSearchTrips } from '../hooks/useTrips';
import type { SearchCriteria } from '../types';

const seatsText = (n: number): string => (n > 1 ? `${n} places` : '1 place');

/** The contract's request, from what the passenger chose (a place keeps only its Lieu fields). */
function toDemande({ depart, destination, places, later }: SearchCriteria): DemandeRecherche {
  const lieu = ({ libelle, latitude, longitude }: SearchCriteria['depart']) => ({ libelle, latitude, longitude });
  const quand = later === null ? 'maintenant' : toIsoWithOffset(new Date(later), -new Date(later).getTimezoneOffset());
  return { depart: lieu(depart), destination: lieu(destination), places, quand };
}

/** Same words as the passenger home for a driver on the road; day + hour for a planned trip. */
function passingText(result: ResultatRecherche): { label: string; value: string } {
  if (result.arriveeDansMinutes !== null) return { label: 'passe dans', value: formatDuration(result.arriveeDansMinutes * 60) };
  const at = new Date(result.heurePassage ?? result.trajet.dateDepart);
  return { label: `passe ${formatDay(at, currentTime())}`, value: formatTime(at) };
}

const whenText = (later: number | null): string => (later === null ? 'Maintenant' : formatDayTime(new Date(later), currentTime()));

/**
 * Passenger search (block 5), one screen: the form first; then the results in the server's
 * order (POST /trips/search) with the search summary always at the bottom. "Modifier" opens
 * the same form, prefilled; the old results stay visible while the new ones come.
 */
export function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  /** What the form starts from when it opens (the criteria, or a suggestion of the empty screen). */
  const [formStart, setFormStart] = useState<SearchCriteria | null>(null);
  const [editing, setEditing] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const demande = useMemo(() => (criteria ? toDemande(criteria) : null), [criteria]);
  const search = useSearchTrips(demande);
  const results = search.data ?? [];
  const updating = search.isPlaceholderData;

  // Editing over existing results: Android back closes the form, not the screen.
  const canCancel = editing && criteria !== null;
  useEffect(() => {
    if (!canCancel) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditing(false);
      return true;
    });
    return () => sub.remove();
  }, [canCancel]);

  const edit = (start: SearchCriteria | null = criteria) => {
    setFormStart(start);
    setEditing(true);
  };
  const apply = (next: SearchCriteria) => {
    setCriteria(next);
    setSelectedId(null);
    setEditing(false);
  };

  if (editing || !criteria) {
    return <SearchForm initial={formStart ?? criteria} onSubmit={apply} onCancel={criteria ? () => setEditing(false) : undefined} />;
  }

  const book = (result: ResultatRecherche) => router.push({ pathname: '/book/[id]', params: { id: String(result.trajet.id) } });
  const driverProfile = (result: ResultatRecherche) => router.push({ pathname: '/driver/[id]', params: { id: String(result.chauffeur.id) } });
  const title = results.length > 1 ? `${results.length} chauffeurs sur ton trajet` : results.length === 1 ? '1 chauffeur sur ton trajet' : 'Aucun chauffeur sur ton trajet';

  const body = (() => {
    if (search.isPending) {
      return (
        <View style={s.inline}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={s.muted}>Recherche des chauffeurs…</Text>
        </View>
      );
    }
    if (search.isError && search.data === undefined) {
      return (
        <View style={s.block}>
          <Flash tone="danger" message={search.error.message} />
          <Button label="Réessayer" icon="refresh" variant="secondary" onPress={() => void search.refetch()} />
        </View>
      );
    }
    if (results.length === 0) {
      return <NoResults s={s} criteria={criteria} onRetry={apply} onEdit={edit} />;
    }
    return results.map((result, i) => (
      <PassingDriverRow
        key={result.trajet.id}
        driver={result}
        rank={i + 1}
        when={passingText(result)}
        selected={result.trajet.id === selectedId}
        onSelect={() => setSelectedId((id) => (id === result.trajet.id ? null : result.trajet.id))}
        details={[`Toi : ${result.priseEnCharge.libelle} → ${result.depose.libelle} · ${formatDistance(result.distanceMetres)}`]}
        highlight={
          criteria.places > 1
            ? `${formatAriary(result.prixTotal)} pour ${criteria.places} places (${formatAriary(result.prixParPlace)} la place)`
            : formatAriary(result.prixTotal)
        }
        actions={
          <View style={s.actions}>
            <Button label={criteria.places > 1 ? `Réserver ${criteria.places} places` : 'Réserver une place'} onPress={() => book(result)} />
            <Button label="Voir le chauffeur" icon="user" variant="secondary" onPress={() => driverProfile(result)} />
          </View>
        }
      />
    ));
  })();

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.list}>
        <View style={s.head} accessibilityLiveRegion="polite">
          <Text style={s.title} accessibilityRole="header">
            {search.isPending ? 'Recherche…' : title}
          </Text>
          {updating ? (
            <View style={s.inline}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={s.muted}>Mise à jour…</Text>
            </View>
          ) : null}
        </View>
        {search.isError && search.data !== undefined ? <Flash tone="danger" message={search.error.message} /> : null}
        {body}
      </ScrollView>

      {/* The active criteria, always visible: touching them opens the same form, prefilled. */}
      <Pressable
        style={({ pressed }) => [s.summary, { paddingBottom: insets.bottom + theme.spacing[4] }, pressed && s.summaryPressed]}
        onPress={() => edit()}
        accessibilityRole="button"
        accessibilityLabel={`Ta recherche : ${criteria.depart.libelle} vers ${criteria.destination.libelle}, ${seatsText(criteria.places)}, ${whenText(criteria.later)}`}
        accessibilityHint="Modifie la recherche"
      >
        <View style={s.summaryText}>
          <Text style={s.summaryMain} numberOfLines={1}>
            {criteria.depart.libelle} → {criteria.destination.libelle}
          </Text>
          <Text style={s.muted} numberOfLines={1}>
            {seatsText(criteria.places)} · {whenText(criteria.later)}
          </Text>
        </View>
        <View style={s.editLink}>
          <Icon name="pencil" size="sm" tone="accent" />
          <Text style={s.editText}>Modifier</Text>
        </View>
      </Pressable>
    </View>
  );
}

type NoResultsProps = {
  s: ReturnType<typeof createStyles>;
  criteria: SearchCriteria;
  onRetry: (criteria: SearchCriteria) => void;
  onEdit: (start: SearchCriteria) => void;
};

/** Designed first (block 5): says what to change, and each button does it at once. */
function NoResults({ s, criteria, onRetry, onEdit }: NoResultsProps) {
  const tips = [
    'Un chauffeur doit passer près de ton départ, puis près de ta destination, dans ce sens.',
    criteria.places > 1 ? `Peu de chauffeurs ont ${criteria.places} places libres : essaie avec moins.` : null,
    criteria.later === null ? 'Personne ne passe dans l’heure : essaie plus tard.' : 'Personne ne passe autour de cette heure : essaie une autre heure.',
  ].filter((tip): tip is string => tip !== null);

  return (
    <View style={s.block}>
      {tips.map((tip) => (
        <Text key={tip} style={s.tip}>
          {tip}
        </Text>
      ))}
      {criteria.places > 1 ? <Button label="Chercher pour 1 place" onPress={() => onRetry({ ...criteria, places: 1 })} /> : null}
      {criteria.later === null ? (
        <Button label="Chercher plus tard" icon="hourglass" variant="secondary" onPress={() => onEdit({ ...criteria, later: nextQuarter(currentTimeMs()) })} />
      ) : (
        <Button label="Chercher maintenant" variant="secondary" onPress={() => onRetry({ ...criteria, later: null })} />
      )}
      <Button label="Modifier la recherche" icon="pencil" variant="ghost" onPress={() => onEdit(criteria)} />
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { padding: gutter, gap: spacing[3] },
    head: { gap: spacing[1] },
    title: { ...typography.heading, color: colors.text },
    inline: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    block: { gap: spacing[3] },
    actions: { gap: spacing[2] },
    tip: { ...typography.body, color: colors.textMuted },
    muted: { ...typography.small, color: colors.textMuted },
    // Attached to the screen edges, like the homes' panels.
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: gutter,
      paddingTop: spacing[4],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      boxShadow: shadows.card,
    },
    summaryPressed: { backgroundColor: colors.fill },
    summaryText: { flex: 1, gap: spacing[1] },
    summaryMain: { ...typography.bodyStrong, color: colors.text },
    editLink: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    editText: { ...typography.bodyStrong, color: colors.accent },
  });
