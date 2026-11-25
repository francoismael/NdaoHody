import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Utilisateur } from '@contract';

import { useSession } from '@/features/auth';
import { useTheme, type Theme } from '@/shared/theme';
import { Avatar, Button, Flash } from '@/shared/ui';
import { formatPhoneNumber } from '@/shared/utils';

import { UserBadge } from '../components/UserBadge';
import { useMe } from '../hooks/useProfile';
import { visibleBadge } from '../services/profileService';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const memberSince = (iso: string): string => {
  const date = new Date(iso);
  return `Membre depuis ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const ridesLabel = (count: number): string => `${count} course${count > 1 ? 's' : ''}`;

const fullNameOf = (user: Pick<Utilisateur, 'prenom' | 'nom'>): string =>
  [user.prenom, user.nom].filter(Boolean).join(' ') || 'Sans nom';

/** Profil: who I am (photo, name, badge, rides), role switch, sign-out. */
export function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { isDriver, signOut, switchRole } = useSession();
  const me = useMe();

  if (me.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement du profil" />
      </View>
    );
  }

  if (me.isError) {
    return (
      <View style={[s.screen, s.content, { paddingTop: insets.top + theme.spacing[6] }]}>
        <Flash tone="danger" message={me.error.message} />
        <Button label="Réessayer" onPress={() => void me.refetch()} variant="secondary" icon="refresh" />
        <Button label="Se déconnecter" onPress={signOut} variant="ghost" icon="logout" />
      </View>
    );
  }

  const user = me.data;
  const name = fullNameOf(user);
  const badge = visibleBadge(user);
  const rides = isDriver ? user.coursesChauffeur : user.coursesPassager;
  const switchLabel = isDriver
    ? 'Passer en mode passager'
    : user.statutChauffeur === 'aucun'
      ? 'Devenir chauffeur'
      : 'Passer en mode chauffeur';

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + theme.spacing[6] }]}>
      <View style={s.head}>
        <Avatar name={name} photoUrl={user.photoUrl} size="lg" />
        <Text style={s.name} accessibilityRole="header">
          {name}
        </Text>
        {badge ? <UserBadge badge={badge} /> : null}
        <Text style={s.meta}>{formatPhoneNumber(user.telephone)}</Text>
        <Text style={s.meta}>{memberSince(user.dateCreation)}</Text>
      </View>

      <View style={s.stats}>
        <View style={s.stat} accessible accessibilityLabel={`${ridesLabel(rides)} en tant que ${isDriver ? 'chauffeur' : 'passager'}`}>
          <Text style={s.statValue}>{rides}</Text>
          <Text style={s.statLabel}>{`${rides > 1 ? 'Courses' : 'Course'} ${isDriver ? 'chauffeur' : 'passager'}`}</Text>
        </View>
        {isDriver ? (
          <View
            style={s.stat}
            accessible
            accessibilityLabel={user.noteMoyenne === null ? 'Pas encore de note' : `Note ${user.noteMoyenne} sur 5, ${user.nombreNotes} avis`}
          >
            <Text style={s.statValue}>{user.noteMoyenne === null ? '—' : user.noteMoyenne.toFixed(1).replace('.', ',')}</Text>
            <Text style={s.statLabel}>{user.nombreNotes > 0 ? `Note · ${user.nombreNotes} avis` : 'Pas encore de note'}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.actions}>
        <Button label="Notifications" onPress={() => router.push('/notifications')} variant="secondary" />
        <Button label={switchLabel} onPress={switchRole} variant="secondary" />
        <Button label="Se déconnecter" onPress={signOut} variant="ghost" icon="logout" />
      </View>
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[6] },
    head: { alignItems: 'center', gap: spacing[2] },
    name: { ...typography.title, color: colors.text, textAlign: 'center' },
    meta: { ...typography.small, color: colors.textMuted },
    stats: { flexDirection: 'row', gap: spacing[3] },
    stat: {
      flex: 1,
      padding: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: spacing[1],
    },
    statValue: { ...typography.number, color: colors.text },
    statLabel: { ...typography.small, color: colors.textMuted },
    actions: { gap: spacing[3] },
  });
