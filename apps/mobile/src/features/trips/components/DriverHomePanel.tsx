import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { StatutTrajet, Trajet } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Tag, type TagTone } from '@/shared/ui';
import { currentTime, formatDayTime } from '@/shared/utils';

import type { PublishAccess } from '../hooks/usePublishAccess';
import { PublishBlockedCard } from './PublishBlockedCard';

const STATUS: Partial<Record<StatutTrajet, { label: string; tone: TagTone }>> = {
  publie: { label: 'Prévu', tone: 'neutral' },
  en_route: { label: 'En route', tone: 'accent' },
  en_cours: { label: 'En course', tone: 'accent' },
};

/** How many coming trips the home shows (the rest: "Mes trajets"). */
const SHOWN_TRIPS = 3;

type DriverHomePanelProps = {
  access: PublishAccess;
  /** Coming and on-the-road trips, soonest first. */
  trips: readonly Trajet[];
};

/** Driver home, bottom panel: verified or not, the way to publish, the coming trips. */
export function DriverHomePanel({ access, trips }: DriverHomePanelProps) {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const now = currentTime();

  if (access.status === 'loading') return <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement" />;
  if (access.status === 'error') {
    return (
      <View style={s.wrapper}>
        <Flash tone="danger" message={access.error.message} />
        <Button label="Réessayer" icon="refresh" variant="secondary" onPress={access.retry} />
      </View>
    );
  }

  const ready = access.status === 'ready';
  return (
    <View style={s.wrapper}>
      <View style={s.head}>
        <Text style={s.title} accessibilityRole="header">
          Tes trajets
        </Text>
        <Tag label={ready ? 'Chauffeur vérifié' : 'Non vérifié'} tone={ready ? 'accent' : 'neutral'} icon={ready ? 'shield-check' : 'lock'} />
      </View>

      {ready ? null : <PublishBlockedCard blocker={access.blocker} />}

      {trips.slice(0, SHOWN_TRIPS).map((trip) => {
        const status = STATUS[trip.statut];
        return (
          <View key={trip.id} style={s.trip} accessible>
            <View style={s.tripText}>
              <Text style={s.tripRoute} numberOfLines={1}>
                {trip.depart.libelle} → {trip.arrivee.libelle}
              </Text>
              <Text style={s.tripMeta}>
                {trip.type === 'immediat' ? 'Maintenant' : formatDayTime(new Date(trip.dateDepart), now)} · {trip.placesLibres}/{trip.placesTotal} place(s) libre(s)
              </Text>
            </View>
            {status ? <Tag label={status.label} tone={status.tone} /> : null}
          </View>
        );
      })}
      {ready && trips.length === 0 ? <Text style={s.empty}>Aucun trajet prévu. Publie ton premier trajet.</Text> : null}

      {ready ? <Button label="Publier un trajet" icon="car" onPress={() => router.push('/publish')} /> : null}
      {trips.length > SHOWN_TRIPS ? <Button label="Voir tous mes trajets" variant="ghost" onPress={() => router.push('/my-trips')} /> : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    wrapper: { gap: spacing[3] },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
    title: { ...typography.heading, color: colors.text },
    trip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[3],
      borderRadius: radii.md,
      backgroundColor: colors.fill,
    },
    tripText: { flex: 1, gap: spacing[1] },
    tripRoute: { ...typography.bodyStrong, color: colors.text },
    tripMeta: { ...typography.small, color: colors.textMuted },
    empty: { ...typography.small, color: colors.textMuted },
  });
