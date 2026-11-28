import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Icon } from '@/shared/ui';

import { EMERGENCY_NUMBERS, callUrl, type EmergencyNumber } from '../rules';

/**
 * The emergency button of the ride screens (passenger and driver): always visible on the map,
 * top right, 48 dp at least. Opens the list of numbers; a touch opens the phone app on the number.
 */
export function EmergencyButton() {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const close = (): void => {
    setOpen(false);
    setFailed(null);
  };
  // Opened directly, the failure handled (see callUrl): no rebuild for a <queries> entry.
  const call = ({ numero }: EmergencyNumber): void => {
    setFailed(null);
    Linking.openURL(callUrl(numero)).catch(() => setFailed(numero));
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Urgence"
        accessibilityHint="Ouvre les numéros d’urgence"
        style={({ pressed }) => [s.button, pressed && s.buttonPressed]}
      >
        <Icon name="phone" tone="onDanger" />
        <Text style={s.buttonText}>Urgence</Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + theme.spacing[6] }]}>
            <Text style={s.title} accessibilityRole="header">
              En cas d’urgence, appelle
            </Text>
            <Text style={s.muted}>Un appui ouvre l’appel sur ton téléphone.</Text>
            <View style={s.list}>
              {EMERGENCY_NUMBERS.map((n) => (
                <Pressable
                  key={n.numero}
                  onPress={() => call(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Appeler le ${n.numero}, ${n.libelle}`}
                  style={({ pressed }) => [s.row, pressed && s.rowPressed]}
                >
                  <Text style={s.number}>{n.numero}</Text>
                  <Text style={s.label}>{n.libelle}</Text>
                  <Icon name="phone" tone="danger" />
                </Pressable>
              ))}
            </View>
            {failed ? <Flash tone="danger" message={`Ton téléphone n’a pas pu ouvrir l’appel. Compose le ${failed} toi-même.`} /> : null}
            <Button label="Fermer" variant="secondary" onPress={close} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = ({ colors, typography, fontFamilies, spacing, gutter, radii, shadows }: Theme) =>
  StyleSheet.create({
    // Above the map, under the header: never in a menu (bloc 9).
    button: {
      position: 'absolute',
      top: spacing[3],
      right: gutter,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      borderRadius: radii.full,
      backgroundColor: colors.danger,
      boxShadow: shadows.card,
    },
    buttonPressed: { backgroundColor: colors.dangerPressed },
    buttonText: { ...typography.bodyStrong, color: colors.onDanger },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    sheet: {
      gap: spacing[3],
      paddingHorizontal: gutter,
      paddingTop: spacing[6],
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      backgroundColor: colors.surface,
    },
    title: { ...typography.heading, color: colors.text },
    muted: { ...typography.small, color: colors.textMuted },
    list: { gap: spacing[2] },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerSurface,
    },
    rowPressed: { backgroundColor: colors.fill },
    number: { ...typography.heading, fontFamily: fontFamilies.bold, color: colors.danger },
    label: { ...typography.body, color: colors.text, flex: 1 },
  });
