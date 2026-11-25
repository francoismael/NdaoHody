import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type Theme } from '@/shared/theme';

export type ShellScreenProps = {
  title: string;
  /** Session du plan qui remplira l'écran, par exemple « R14 ». */
  session: string;
  /** Écran sans en-tête (onglet, premier écran) : ajoute la marge de la barre d'état. */
  safeTop?: boolean;
  /** Les boutons qui mènent aux écrans suivants. */
  children?: ReactNode;
};

/**
 * PROVISOIRE (R1) : coquille d'écran, un titre et des liens.
 * Chaque session remplace la coquille de son écran par le vrai contenu.
 */
export function ShellScreen({ title, session, safeTop = false, children }: ShellScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, safeTop && { paddingTop: insets.top + theme.spacing[6] }]}
    >
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.session}>Coquille : contenu en {session}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: gutter, gap: spacing[2] },
    title: { ...typography.title, color: colors.text },
    session: { ...typography.small, color: colors.textMuted },
    actions: { marginTop: spacing[4], gap: spacing[3] },
  });
