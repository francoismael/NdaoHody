import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileHeader, ProfileStats, ratingStat, ridesStat, toDisplayBadge, useDriverProfile, vehicleText } from '@/features/profile';
import { bookingHref, readBookingLink, type BookingParams } from '@/features/trips';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash } from '@/shared/ui';

import { ReviewItem } from '../components/ReviewItem';
import { useUserReviews } from '../hooks/useReviews';

/** Comments shown at first, then this many more per "Voir plus". */
const REVIEWS_PAGE = 5;

const ridesText = (count: number): string => (count > 1 ? 'Courses' : 'Course');

/**
 * The driver's public profile (block 6): who he is, his figures, what passengers wrote.
 * `id` = the driver; the other params = the booking link from the home or the search (bookingLink.ts), to book that trip.
 */
export function DriverProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<BookingParams & { id: string }>();
  const driverId = Number(params.id);
  const link = useMemo(() => readBookingLink(params), [params]);
  const profile = useDriverProfile(driverId);
  const reviews = useUserReviews(driverId);
  const [shown, setShown] = useState(REVIEWS_PAGE);

  if (profile.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement du profil" />
      </View>
    );
  }

  if (profile.isError) {
    return (
      <View style={[s.screen, s.content]}>
        <Flash tone="danger" message={profile.error.message} />
        <Button label="Réessayer" onPress={() => void profile.refetch()} variant="secondary" icon="refresh" />
      </View>
    );
  }

  const driver = profile.data;
  // The server already sends them newest first; a review without words has nothing to read here.
  const comments = (reviews.data ?? []).filter((review) => review.commentaire);
  const visible = comments.slice(0, shown);

  const commentsBody = (() => {
    if (reviews.isPending) return <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement des avis" />;
    if (reviews.isError) {
      return (
        <View style={s.block}>
          <Flash tone="danger" message={reviews.error.message} />
          <Button label="Réessayer" onPress={() => void reviews.refetch()} variant="secondary" icon="refresh" />
        </View>
      );
    }
    if (comments.length === 0) return <Text style={s.empty}>Pas encore de commentaire.</Text>;
    return (
      <View style={s.block}>
        {visible.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
        {comments.length > shown ? (
          <Button label="Voir plus de commentaires" variant="ghost" onPress={() => setShown((n) => n + REVIEWS_PAGE)} />
        ) : null}
      </View>
    );
  })();

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <ProfileHeader
          name={driver.prenom}
          photoUrl={driver.photoUrl}
          badge={toDisplayBadge(driver.badge)}
          meta={driver.vehicule ? [vehicleText(driver.vehicule)] : []}
        />

        <ProfileStats
          items={[
            ratingStat(driver.noteMoyenne, driver.nombreNotes),
            ridesStat(driver.nombreCourses, ridesText(driver.nombreCourses), `${driver.nombreCourses} ${ridesText(driver.nombreCourses).toLowerCase()} effectuée${driver.nombreCourses > 1 ? 's' : ''}`),
          ]}
        />

        <View style={s.block}>
          <Text style={s.section} accessibilityRole="header">
            {comments.length > 0 ? `Commentaires des passagers (${comments.length})` : 'Commentaires des passagers'}
          </Text>
          {commentsBody}
        </View>
      </ScrollView>

      {link ? (
        <View style={[s.footer, { paddingBottom: insets.bottom + theme.spacing[4] }]}>
          <Button label={link.places > 1 ? `Réserver ${link.places} places` : 'Réserver une place'} onPress={() => router.push(bookingHref(link))} />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, gutter }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[6] },
    block: { gap: spacing[3] },
    section: { ...typography.heading, color: colors.text },
    empty: { ...typography.body, color: colors.textMuted },
    footer: {
      paddingHorizontal: gutter,
      paddingTop: spacing[4],
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },
  });
