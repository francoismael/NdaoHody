/**
 * ÉCRAN DE CONTRÔLE PROVISOIRE (session 4) : chaque composant de shared/ui,
 * dans tous ses états. Se regarde en clair puis en sombre sur le téléphone.
 * À supprimer avec sa route (src/app/ui-preview.tsx) et la pastille « UI »
 * de HomeScreen quand les écrans du Compte serviront de contrôle.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme, type Theme } from '@/shared/theme';

import { Button, type ButtonVariant } from './Button';
import { Icon, type IconSize, type IconTone } from './Icon';
import { iconPaths, type IconName } from './icons';

const ICON_NAMES = Object.keys(iconPaths) as IconName[];
const ICON_SIZES: IconSize[] = ['sm', 'md', 'lg'];
const ICON_TONES: IconTone[] = ['default', 'soft', 'muted', 'accent', 'danger'];
const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost'];
/** Appui sans effet : l'écran de contrôle montre l'état, il n'envoie rien. */
const noop = () => undefined;

export function UiPreview() {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const [sending, setSending] = useState(false);
  // Simule un envoi court (100 ms) : l'indicateur doit quand même rester ~400 ms.
  const simulateSend = () => {
    setSending(true);
    setTimeout(() => setSending(false), 100);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Composants · {theme.scheme === 'dark' ? 'sombre' : 'clair'}</Text>

      {BUTTON_VARIANTS.map((variant) => (
        <Section key={variant} title={`Button · ${variant}`} s={s}>
          <Button variant={variant} label="Recevoir le code" onPress={noop} />
          <Button variant={variant} label="Modifier mon numéro" icon="pencil" onPress={noop} />
          <Button variant={variant} label="Désactivé" disabled onPress={noop} />
          <Button variant={variant} label="Chargement" loading onPress={noop} />
        </Section>
      ))}

      <Section title="Button · envoi court (anti-clignotement)" s={s}>
        <Button label="Simuler un envoi" loading={sending} onPress={simulateSend} />
        <Button variant="ghost" width="auto" label="Renvoyer le code" icon="refresh" onPress={noop} />
      </Section>

      <Section title={`Icon · ${ICON_NAMES.length} icônes`} s={s}>
        <View style={s.grid}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={s.cell}>
              <Icon name={name} />
              <Text style={s.caption} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Icon · tailles" s={s}>
        <View style={s.row}>
          {ICON_SIZES.map((size) => (
            <View key={size} style={s.cell}>
              <Icon name="user" size={size} />
              <Text style={s.caption}>{size}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Icon · tons" s={s}>
        <View style={s.row}>
          {ICON_TONES.map((tone) => (
            <View key={tone} style={s.cell}>
              <Icon name="shield-check" tone={tone} />
              <Text style={s.caption}>{tone}</Text>
            </View>
          ))}
          <View style={s.cell}>
            <View style={s.onPrimaryBox}>
              <Icon name="check" tone="onPrimary" label="Validé" />
            </View>
            <Text style={s.caption}>onPrimary</Text>
          </View>
        </View>
      </Section>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Section({ title, s, children }: { title: string; s: Styles; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.label}>{title}</Text>
      {children}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: gutter, paddingBottom: spacing[10], gap: spacing[6] },
    title: { ...typography.title, color: colors.text },
    section: { gap: spacing[3] },
    label: { ...typography.label, color: colors.textMuted },
    caption: { ...typography.caption, color: colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], alignItems: 'flex-end' },
    cell: {
      width: 76,
      alignItems: 'center',
      gap: spacing[1],
      paddingVertical: spacing[3],
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    onPrimaryBox: {
      padding: spacing[1],
      borderRadius: radii.full,
      backgroundColor: colors.primary,
    },
  });
