import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useStore } from 'zustand';

import { DOCUMENT_LABELS } from '@/features/verification/rules';
import { AppMap, MovingMarker, RouteLine } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button } from '@/shared/ui';
import { currentTimeMs } from '@/shared/utils';

import { sessionStore } from '../session/sessionStore';
import { demoStore } from './demoStore';
import * as engine from './engine';
import { resetDemo } from './resetDemo';

/**
 * Demo panel (R3): the presenter's remote control, not an app screen.
 * It plays the other person through the engine (same API routes), changes the
 * clock speed and resets everything. Reached by the dev route `demo` only.
 */

const SPEEDS = [1, 5, 20] as const;
/** The panel reads the server once a second; the car glides over that second. */
const REFRESH_MS = 1000;

const mmss = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const remaining = (iso: string | null): string | null => (iso ? mmss(new Date(iso).getTime() - currentTimeMs()) : null);

export function DemoPanel() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const settings = useStore(demoStore);
  const role = useStore(sessionStore, (s) => s.role);
  const speed = settings.clock?.speed ?? 1;

  const [focus, setFocus] = useState<engine.DemoFocus | null>(null);
  const [application, setApplication] = useState<engine.DemoApplication | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setFocus(await engine.getFocus());
      setApplication(await engine.getApplication());
    } catch (error) {
      setFocus(null);
      setApplication(null);
      setMessage(error instanceof Error ? error.message : 'Lecture impossible.');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const run = async (label: string, action: () => Promise<void>): Promise<void> => {
    setBusy(label);
    setMessage(null);
    try {
      await action();
      setMessage(`${label} : fait.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${label} : échec.`);
    } finally {
      setBusy(null);
      await refresh();
    }
  };

  const act = (label: string, action: (f: engine.DemoFocus) => Promise<void>, shown = true) =>
    focus && shown ? (
      <Button key={label} label={label} variant="secondary" width="auto" loading={busy === label} onPress={() => void run(label, () => action(focus))} />
    ) : null;

  const f = focus;
  const playsDriver = f?.side === 'passager';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        Panneau de démo
      </Text>

      <View style={styles.map}>
        <AppMap>
          {f ? <RouteLine id="demo-route" coordinates={f.trajet.chemin} /> : null}
          {f ? <MovingMarker id="demo-pickup" coordinate={f.pickup} kind="place" /> : null}
          {f?.driverPosition ? <MovingMarker id="demo-car" coordinate={f.driverPosition} glideMs={REFRESH_MS} /> : null}
        </AppMap>
      </View>

      <View style={styles.card} accessible accessibilityLiveRegion="polite">
        {f ? (
          <>
            <Text style={styles.strong}>
              Réservation n° {f.reservation.id} · {f.reservation.statut}
            </Text>
            <Text style={styles.text}>Trajet n° {f.trajet.id} · {f.trajet.statut}</Text>
            <Text style={styles.text}>
              Distance : {f.distanceMetres === null ? '—' : `${f.distanceMetres} m`} · arrivée dans{' '}
              {f.arriveeDansSecondes === null ? '—' : mmss(f.arriveeDansSecondes * 1000)}
            </Text>
            <Text style={styles.text}>Sous 500 m : {f.nearPickup ? 'oui' : 'non'}</Text>
            {f.reservation.statut === 'en_attente' ? <Text style={styles.text}>Réponse attendue encore {remaining(f.reservation.dateExpiration)}</Text> : null}
            {f.reservation.statut === 'chauffeur_sur_place' ? (
              <Text style={styles.text}>
                Attente : {remaining(f.reservation.finAttente)} · prolongations : {f.reservation.prolongations}
              </Text>
            ) : null}
            <Text style={styles.muted}>Je joue : {playsDriver ? 'le chauffeur' : 'le passager'}</Text>
          </>
        ) : (
          <Text style={styles.text}>Aucune réservation. Réserve depuis l’app, ou envoie une demande (rôle chauffeur).</Text>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <Text style={styles.section}>Vitesse de l’horloge (×{speed})</Text>
      <View style={styles.wrap}>
        {SPEEDS.map((s) => (
          <Button key={s} label={`×${s}`} variant={s === speed ? 'primary' : 'secondary'} width="auto" onPress={() => engine.setDemoSpeed(s)} />
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.strong}>Réponse auto du chauffeur ({settings.autoAcceptSeconds} s)</Text>
        <Switch
          value={settings.autoAccept}
          onValueChange={engine.setAutoAccept}
          trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primary }}
          thumbColor={theme.colors.surface}
          accessibilityLabel="Réponse automatique du chauffeur"
        />
      </View>
      <View style={styles.wrap}>
        <Button label="−10 s" variant="ghost" width="auto" onPress={() => engine.setAutoAcceptSeconds(settings.autoAcceptSeconds - 10)} />
        <Button label="+10 s" variant="ghost" width="auto" onPress={() => engine.setAutoAcceptSeconds(settings.autoAcceptSeconds + 10)} />
      </View>

      {role === 'passager' ? (
        <>
          <Text style={styles.section}>Moi (passager)</Text>
          <Button
            label="Réserver une place de test"
            variant="secondary"
            loading={busy === 'Réservation de test'}
            hint="Depuis Analakely, dans la première voiture qui passe"
            onPress={() => void run('Réservation de test', engine.createTestBooking)}
          />
        </>
      ) : null}

      {playsDriver && f ? (
        <>
          <Text style={styles.section}>Le chauffeur simulé</Text>
          <View style={styles.wrap}>
            {act('Accepter', engine.driverAccepts, engine.allowed(f, 'acceptee'))}
            {act('Refuser', (x) => engine.driverRefuses(x, 'Voiture pleine'), engine.allowed(f, 'refusee'))}
            {act('Partir', engine.driverDeparts, f.trajet.statut === 'publie')}
            {act('Aller au point', engine.skipToPickup, f.reservation.statut === 'acceptee' && !f.nearPickup)}
            {act('Je suis sur place', engine.driverArrives, engine.allowed(f, 'chauffeur_sur_place'))}
            {act('Prolonger +5 min', engine.driverExtendsWait, f.reservation.statut === 'chauffeur_sur_place')}
            {act('Fin du délai', engine.skipWait, f.reservation.statut === 'en_attente' || f.reservation.statut === 'chauffeur_sur_place')}
            {act('Démarrer', engine.driverStarts, engine.allowed(f, 'en_course'))}
            {act('Absent', engine.driverMarksAbsent, engine.allowed(f, 'absent'))}
            {act('Terminer', engine.driverFinishes, engine.allowed(f, 'terminee'))}
            {act('Annuler', engine.driverCancels, engine.allowed(f, 'annulee_chauffeur'))}
          </View>
        </>
      ) : null}

      {/* In both modes (bloc 8): a request must ring even while the driver is in passenger mode. */}
      <Text style={styles.section}>Le passager simulé</Text>
      <View style={styles.wrap}>
        <Button label="Nouvelle demande" variant="secondary" width="auto" loading={busy === 'Nouvelle demande'} onPress={() => void run('Nouvelle demande', engine.passengerRequests)} />
        {f && !playsDriver ? act('Annuler la demande', engine.passengerCancels, engine.allowed(f, 'annulee_passager')) : null}
        {f && !playsDriver ? act('Fin du délai', engine.skipWait, f.reservation.statut === 'en_attente') : null}
      </View>

      {application && (application.documents.length > 0 || application.statutChauffeur !== 'aucun') ? (
        <>
          <Text style={styles.section}>Dossier chauffeur (l’admin)</Text>
          <View style={styles.card} accessible accessibilityLiveRegion="polite">
            <Text style={styles.strong}>Statut : {application.statutChauffeur}</Text>
            {application.documents.map((d) => (
              <Text key={d.id} style={styles.text}>
                {DOCUMENT_LABELS[d.type]} : {d.statut}
                {d.motifRefus ? ` (${d.motifRefus})` : ''}
              </Text>
            ))}
            {application.vehicules.map((v) => (
              <Text key={v.id} style={styles.text}>
                Véhicule {v.immatriculation} : {v.statut}
              </Text>
            ))}
          </View>
          {/* Each vehicle waiting has its own answer (several vehicles, 26/11), even once the driver is validated. */}
          {application.statutChauffeur !== 'en_attente'
            ? application.vehicules
                .filter((v) => v.statut === 'en_attente')
                .map((v) => (
                  <View key={v.id} style={styles.wrap}>
                    <Button
                      label={`Valider ${v.immatriculation}`}
                      variant="secondary"
                      width="auto"
                      loading={busy === `Validation ${v.id}`}
                      onPress={() => void run(`Validation ${v.id}`, () => engine.adminApprovesVehicle(v.id))}
                    />
                    <Button
                      label={`Refuser ${v.immatriculation}`}
                      variant="secondary"
                      width="auto"
                      loading={busy === `Refus ${v.id}`}
                      onPress={() => void run(`Refus ${v.id}`, () => engine.adminRejectsVehicle(v.id, 'Photo floue'))}
                    />
                  </View>
                ))
            : null}
          {application.statutChauffeur === 'en_attente' ? (
            <View style={styles.wrap}>
              <Button label="Valider" variant="secondary" width="auto" loading={busy === 'Validation'} onPress={() => void run('Validation', engine.adminApproves)} />
              <Button
                label="Refuser le selfie"
                variant="secondary"
                width="auto"
                loading={busy === 'Refus du selfie'}
                onPress={() => void run('Refus du selfie', () => engine.adminRejects('Visage pas assez visible', ['selfie']))}
              />
              <Button
                label="Refuser tout"
                variant="secondary"
                width="auto"
                loading={busy === 'Refus du dossier'}
                onPress={() => void run('Refus du dossier', () => engine.adminRejects('Photos illisibles'))}
              />
            </View>
          ) : null}
        </>
      ) : null}

      <Text style={styles.section}>Tout recommencer</Text>
      <Button
        label="Remettre la démo à zéro"
        variant="secondary"
        loading={busy === 'Remise à zéro'}
        hint="Heure réelle, réglages par défaut, données de départ, déconnexion"
        onPress={() => void run('Remise à zéro', resetDemo)}
      />
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii, controlHeight }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: gutter, gap: spacing[3], paddingBottom: spacing[10] },
    title: { ...typography.title, color: colors.text },
    map: { height: 260, borderRadius: radii.lg, overflow: 'hidden' },
    card: { padding: spacing[4], gap: spacing[1], borderRadius: radii.md, backgroundColor: colors.surface },
    strong: { ...typography.bodyStrong, color: colors.text, flexShrink: 1 },
    text: { ...typography.body, color: colors.textSoft },
    muted: { ...typography.small, color: colors.textMuted },
    message: { ...typography.small, color: colors.accent, marginTop: spacing[2] },
    section: { ...typography.subheading, color: colors.text, marginTop: spacing[3] },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    row: {
      minHeight: controlHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      borderRadius: radii.md,
      backgroundColor: colors.surface,
    },
  });
