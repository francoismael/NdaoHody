/**
 * ÉCRAN DE CONTRÔLE PROVISOIRE (session 3) : affiche tout le thème.
 * À supprimer avec sa route (src/app/theme-preview.tsx) quand les vrais
 * composants de shared/ui existeront.
 */
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ColorRole } from './colors';
import type { ShadowRole } from './shadows';
import { useTheme, type Theme } from './theme';
import type { FontWeightName, TextRole } from './typography';

const WEIGHTS: { name: FontWeightName; css: '400' | '500' | '600' | '700' | '800' }[] = [
  { name: 'regular', css: '400' },
  { name: 'medium', css: '500' },
  { name: 'semiBold', css: '600' },
  { name: 'bold', css: '700' },
  { name: 'extraBold', css: '800' },
];

export function ThemePreview() {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { colors, typography, fontFamilies, radii, spacing } = theme;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={[typography.title, s.text]}>
        Mode : {theme.scheme === 'dark' ? 'sombre' : 'clair'}
      </Text>
      <Text style={[typography.small, s.muted]}>
        Bascule le téléphone en clair/sombre : cet écran doit changer en direct.
      </Text>

      <Text style={[typography.label, s.section]}>Inter ou police système</Text>
      {WEIGHTS.map(({ name, css }) => (
        <View key={name} style={s.row}>
          <Text style={[typography.caption, s.muted, s.weightLabel]}>{css}</Text>
          <Text style={[s.sample, { fontFamily: fontFamilies[name] }]}>Inter Rag 0123</Text>
          <Text style={[s.sample, { fontWeight: css }]}>Système Rag 0123</Text>
        </View>
      ))}

      <Text style={[typography.label, s.section]}>Rôles typographiques</Text>
      {(Object.keys(typography) as TextRole[]).map((role) => (
        <Text key={role} style={[typography[role], s.text]}>
          {role} · Trajet Tana → Antsirabe 25 000 Ar
        </Text>
      ))}

      <Text style={[typography.label, s.section]}>Contrastes gardés du PWA</Text>
      <View style={[s.pair, { backgroundColor: colors.background }]}>
        <Text style={[typography.bodyStrong, { color: colors.accent }]}>accent sur background (5,2:1)</Text>
      </View>
      <View style={[s.pair, { backgroundColor: colors.surface }]}>
        <Text style={[typography.body, { color: colors.textSubtle }]}>textSubtle sur surface (5:1)</Text>
      </View>

      <Text style={[typography.label, s.section]}>Ombres (à juger sur le Samsung)</Text>
      {(Object.keys(theme.shadows) as ShadowRole[]).map((role) => (
        <View
          key={role}
          style={[
            s.shadowBox,
            {
              boxShadow: theme.shadows[role],
              backgroundColor: role === 'nav' ? colors.surfaceFixedDark : colors.surface,
            },
          ]}
        >
          <Text style={[typography.bodyStrong, { color: role === 'nav' ? colors.textOnFixedDarkMuted : colors.text }]}>
            {role}
          </Text>
        </View>
      ))}

      <Text style={[typography.label, s.section]}>Contrôle, rayons, espacements</Text>
      <View style={s.button}>
        <Text style={[typography.bodyStrong, { color: colors.onPrimary }]}>Bouton principal (56)</Text>
      </View>
      <View style={s.row}>
        {(Object.keys(radii) as (keyof typeof radii)[]).map((r) => (
          <View key={r} style={[s.radius, { borderRadius: Math.min(radii[r], 28) }]}>
            <Text style={[typography.caption, s.text]}>{r}</Text>
          </View>
        ))}
      </View>
      {(Object.keys(spacing).map(Number) as (keyof typeof spacing)[]).map((k) => (
        <View key={k} style={s.row}>
          <Text style={[typography.caption, s.muted, s.weightLabel]}>{spacing[k]}</Text>
          <View style={{ width: spacing[k], height: spacing[2], backgroundColor: colors.accent }} />
        </View>
      ))}

      <Text style={[typography.label, s.section]}>Couleurs ({Object.keys(colors).length} rôles)</Text>
      {(Object.keys(colors) as ColorRole[]).map((role) => (
        <View key={role} style={s.row}>
          <View style={[s.swatch, { backgroundColor: colors[role] }]} />
          <Text style={[typography.small, s.text]}>{role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: gutter, paddingBottom: spacing[10], gap: spacing[2] },
    text: { color: colors.text },
    muted: { color: colors.textMuted },
    section: { color: colors.textMuted, marginTop: spacing[6] },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    weightLabel: { width: 32 },
    sample: { flex: 1, fontSize: typography.heading.fontSize, color: colors.text },
    pair: { padding: spacing[4], borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
    shadowBox: { padding: spacing[5], borderRadius: radii.lg, marginBottom: spacing[3] },
    button: {
      height: controlHeight,
      borderRadius: radii.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radius: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSurface,
      borderWidth: 1,
      borderColor: colors.accentBorder,
    },
    swatch: {
      width: 40,
      height: 28,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
  });
