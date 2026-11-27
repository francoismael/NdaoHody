import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, Icon, PromptCard } from '@/shared/ui';

import { usePushPermission } from '../hooks/usePushPermission';

// On Android the system box has its own text: we explain BEFORE asking (lesson of the location).
const ASK = {
  title: 'Active les notifications',
  text: 'Pour ne rien rater sur NdaoHody (réservations, messagerie, réponses, etc.)',
};
const REFUSED = {
  title: 'Notifications désactivées',
  text: 'L’app marche quand même, mais tu ne seras pas prévenu : garde l’écran de ta demande ouvert pour voir la réponse. Tu peux les activer dans les réglages du téléphone.',
};
/** Read by TalkBack on the round reminder: short, and about what this person waits for. */
const BANNER = {
  chauffeur: 'Active les notifications pour recevoir les demandes de réservation.',
  passager: 'Active les notifications pour recevoir les réponses des chauffeurs.',
} as const;

/** A little see-through: the map stays readable under it; full when pressed. */
const BANNER_OPACITY = 0.8;

export type PushPermissionPromptProps = {
  /** Where the reminder banner may show (the tab screens: no header to cover). */
  banner: boolean;
};

/**
 * While the notifications are not allowed. The dialog (why first, then the system prompt)
 * opens by itself only the first time; once closed, a banner at the top of the screen reminds
 * and opens it again. Refused: the app stays usable and says what it means.
 */
export function PushPermissionPrompt({ banner }: PushPermissionPromptProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  const { permission, dismissed, request, dismiss, openSettings } = usePushPermission();
  const [reopened, setReopened] = useState(false);
  const [asking, setAsking] = useState(false);

  if (permission === null || dismissed === null || permission.granted) return null;
  const refused = !permission.canAskAgain;
  const dialogOpen = !dismissed || reopened;
  const close = () => {
    setReopened(false);
    dismiss();
  };
  const ask = async () => {
    setAsking(true);
    const result = await request();
    setAsking(false);
    // Granted: everything goes away. Blocked for good: the card now says what it means.
    if (!result.granted && result.canAskAgain) close();
  };

  return (
    <>
      {dismissed && banner && !dialogOpen ? (
        // A small round reminder at the top: touched, the dialog opens again.
        <View style={[s.bannerArea, { top: insets.top + theme.spacing[2] }]} pointerEvents="box-none">
          <Pressable
            onPress={() => setReopened(true)}
            accessibilityRole="button"
            accessibilityLabel={`Notifications désactivées. ${BANNER[role]}`}
            hitSlop={8}
            style={({ pressed }) => [s.banner, pressed && s.bannerPressed]}
          >
            <Icon name="alert-circle" tone="danger" />
          </Pressable>
        </View>
      ) : null}
      <Modal transparent visible={dialogOpen} animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={s.backdrop}>
          {refused ? (
            <PromptCard {...REFUSED}>
              <Button label="Ouvrir les réglages" icon="settings" onPress={openSettings} />
              <Button label="Compris" variant="ghost" onPress={close} />
            </PromptCard>
          ) : (
            <PromptCard {...ASK}>
              <Button label="Activer les notifications" icon="bell" onPress={() => void ask()} loading={asking} />
              <Button label="Plus tard" variant="ghost" onPress={close} />
            </PromptCard>
          )}
        </View>
      </Modal>
    </>
  );
}

const createStyles = ({ colors, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    // Raised a little from the middle: lines up with the location card of the home (above the tab bar).
    backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter, paddingBottom: spacing[10], backgroundColor: colors.overlay },
    bannerArea: { position: 'absolute', left: gutter },
    // Same look as Flash "danger" (pink, red edge), round, a little see-through above the map.
    banner: {
      width: spacing[10] + spacing[2],
      height: spacing[10] + spacing[2],
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerSurface,
      boxShadow: shadows.card,
      opacity: BANNER_OPACITY,
    },
    bannerPressed: { opacity: 1 },
  });
