import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Utilisateur } from '@contract';

import { useSession } from '@/features/auth';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash } from '@/shared/ui';
import { formatPhoneNumber } from '@/shared/utils';

import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileStats, ratingStat, ridesStat } from '../components/ProfileStats';
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
  const rides = isDriver ? user.coursesChauffeur : user.coursesPassager;
  const switchLabel = isDriver
    ? 'Passer en mode passager'
    : user.statutChauffeur === 'aucun'
      ? 'Devenir chauffeur'
      : 'Passer en mode chauffeur';

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + theme.spacing[6] }]}>
      <ProfileHeader name={name} photoUrl={user.photoUrl} badge={visibleBadge(user)} meta={[formatPhoneNumber(user.telephone), memberSince(user.dateCreation)]} />

      <ProfileStats
        items={[
          ridesStat(
            rides,
            `${rides > 1 ? 'Courses' : 'Course'} ${isDriver ? 'chauffeur' : 'passager'}`,
            `${ridesLabel(rides)} en tant que ${isDriver ? 'chauffeur' : 'passager'}`,
          ),
          ...(isDriver ? [ratingStat(user.noteMoyenne, user.nombreNotes)] : []),
        ]}
      />

      <View style={s.actions}>
        <Button label="Notifications" onPress={() => router.push('/notifications')} variant="secondary" />
        {/* A route, not an import: verification already imports profile (no loop). */}
        {isDriver ? <Button label="Mes véhicules" icon="car" onPress={() => router.push('/my-vehicles')} variant="secondary" /> : null}
        <Button label={switchLabel} onPress={switchRole} variant="secondary" />
        <Button label="Se déconnecter" onPress={signOut} variant="ghost" icon="logout" />
      </View>
    </ScrollView>
  );
}

const createStyles = ({ colors, spacing, gutter }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[6] },
    actions: { gap: spacing[3] },
  });
