import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, PermissionStatus, useCameraPermissions, type CameraType } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TypeDocument } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash } from '@/shared/ui';

/** What the single camera screen can photograph. */
export type CaptureKind = TypeDocument | 'vehicule';

type Frame = 'card' | 'face' | 'wide';

const GUIDES: Record<CaptureKind, { title: string; tip: string; facing: CameraType; frame: Frame }> = {
  permis_recto: {
    title: 'Recto du permis',
    tip: 'Pose ton permis à plat, sans reflet. Les 4 coins dans le cadre, téléphone immobile.',
    facing: 'back',
    frame: 'card',
  },
  permis_verso: {
    title: 'Verso du permis',
    tip: 'Retourne ton permis. Les 4 coins dans le cadre, sans reflet ni ombre.',
    facing: 'back',
    frame: 'card',
  },
  selfie: {
    title: 'Ton selfie',
    tip: 'Visage bien visible et éclairé, sans lunettes de soleil ni casque.',
    facing: 'front',
    frame: 'face',
  },
  vehicule: {
    title: 'Ton véhicule',
    tip: 'Tout le véhicule dans le cadre, de trois quarts avant, en plein jour.',
    facing: 'back',
    frame: 'wide',
  },
};

/**
 * 0.6: text stays readable, files stay small for the real upload (back limit: 5 MB).
 * To check on the Samsung: size of a photo, readability of the licence.
 */
const PHOTO_QUALITY = 0.6;

export type DocumentCameraProps = {
  kind: CaptureKind;
  /** e.g. "Photo 2 sur 4". */
  progress?: string;
  /** Receives the temporary photo URI. */
  onAccept: (temporaryUri: string) => void;
  /** Sending the photo (button "Valider" loading). */
  sending?: boolean;
  /** Message of the last failed send. */
  error?: string | null;
};

/**
 * THE camera of the driver flow: one preview at a time (expo-camera rule), so the
 * 4 photos go through this one component, remounted with a new `key` for each kind.
 * Permission first; the shutter only works once the preview is ready; then preview,
 * "Reprendre" or "Valider". The preview is unmounted when the screen loses focus.
 */
export function DocumentCamera({ kind, progress, onAccept, sending = false, error = null }: DocumentCameraProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(theme), [theme]);
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const guide = GUIDES[kind];

  const shoot = async (): Promise<void> => {
    if (!camera.current || !ready || taking) return;
    setTaking(true);
    try {
      // No skipProcessing: Android would no longer fix the orientation.
      const picture = await camera.current.takePictureAsync({ quality: PHOTO_QUALITY });
      setPhotoUri(picture.uri);
    } catch {
      setCameraError('La photo n’a pas pu être prise. Réessaie.');
    } finally {
      setTaking(false);
    }
  };

  const retake = (): void => {
    setPhotoUri(null);
    setReady(false);
  };

  const restartCamera = (): void => {
    setCameraError(null);
    setReady(false);
    setAttempt((n) => n + 1);
  };

  const header = (
    <View style={s.header}>
      {progress ? <Text style={s.progress}>{progress}</Text> : null}
      <Text style={s.title} accessibilityRole="header">
        {guide.title}
      </Text>
      <Text style={s.tip}>{photoUri ? 'Vérifie que tout est net et lisible.' : guide.tip}</Text>
    </View>
  );

  // 1. Permission still being read.
  if (!permission) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.textOnFixedDark} accessibilityLabel="Préparation de l’appareil photo" />
      </View>
    );
  }

  // 2. Not granted: explain, then ask (or send to the settings once Android stops asking).
  if (!permission.granted) {
    return (
      <View style={[s.screen, s.padded, { paddingTop: insets.top + theme.spacing[6], paddingBottom: insets.bottom + theme.spacing[4] }]}>
        <View style={s.header}>
          <Text style={s.title} accessibilityRole="header">
            Autorise l’appareil photo
          </Text>
          <Text style={s.tip}>
            Il sert à photographier ton permis, ton visage et ton véhicule. Les photos servent seulement à vérifier ton dossier.
          </Text>
          {permission.status === PermissionStatus.DENIED ? (
            <Text style={s.tip} accessibilityLiveRegion="polite">
              {permission.canAskAgain
                ? 'Tu as refusé l’accès. Réessaie quand tu es prêt.'
                : 'L’accès est bloqué. Active « Appareil photo » dans les réglages de l’app, puis reviens ici.'}
            </Text>
          ) : null}
        </View>
        <View style={s.actions}>
          {permission.canAskAgain ? (
            <Button label="Autoriser l’appareil photo" icon="camera" onPress={() => void requestPermission()} />
          ) : (
            <Button label="Ouvrir les réglages" icon="settings" onPress={() => void Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  // 3. Photo taken: preview, retake or accept.
  if (photoUri) {
    return (
      <View style={[s.screen, s.padded, { paddingTop: insets.top + theme.spacing[4], paddingBottom: insets.bottom + theme.spacing[4] }]}>
        {header}
        <View style={s.viewport}>
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={`Photo : ${guide.title}`} />
        </View>
        {kind === 'selfie' ? <Text style={s.note}>Ta photo est enregistrée à l’endroit, pas en miroir.</Text> : null}
        {error ? <Flash tone="danger" message={error} /> : null}
        <View style={s.actions}>
          <Button label="Valider" icon="check" loading={sending} onPress={() => onAccept(photoUri)} />
          <Button label="Reprendre" icon="refresh" variant="secondary" disabled={sending} onPress={retake} />
        </View>
      </View>
    );
  }

  // 4. Live preview, only while this screen has the focus.
  return (
    <View style={[s.screen, s.padded, { paddingTop: insets.top + theme.spacing[4], paddingBottom: insets.bottom + theme.spacing[4] }]}>
      {header}
      <View style={s.viewport}>
        {focused && !cameraError ? (
          <CameraView
            key={`${guide.facing}-${attempt}`}
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing={guide.facing}
            mirror={false}
            onCameraReady={() => setReady(true)}
            onMountError={() => setCameraError('L’appareil photo ne démarre pas. Ferme les autres applis qui l’utilisent, puis réessaie.')}
          />
        ) : null}
        <View style={s.frameLayer} pointerEvents="none">
          <View style={[s.frame, s[guide.frame]]} />
        </View>
        {!ready && !cameraError ? (
          <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
            <ActivityIndicator color={theme.colors.textOnFixedDark} accessibilityLabel="L’appareil photo démarre" />
          </View>
        ) : null}
      </View>
      {cameraError ? <Flash tone="danger" message={cameraError} /> : null}
      <View style={s.actions}>
        {cameraError ? (
          <Button label="Réessayer" icon="refresh" onPress={restartCamera} />
        ) : (
          <Button label="Prendre la photo" icon="camera" disabled={!ready} loading={taking} hint={guide.tip} onPress={() => void shoot()} />
        )}
      </View>
    </View>
  );
}

/** ID-1 card (licence): 85.6 × 54 mm. */
const CARD_RATIO = 85.6 / 54;

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceFixedDark },
    padded: { paddingHorizontal: gutter, gap: spacing[4] },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: { gap: spacing[1] },
    progress: { ...typography.label, color: colors.textOnFixedDarkMuted },
    title: { ...typography.title, color: colors.textOnFixedDark },
    tip: { ...typography.body, color: colors.textOnFixedDarkMuted },
    note: { ...typography.small, color: colors.textOnFixedDarkMuted, textAlign: 'center' },
    viewport: { flex: 1, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceFixedDark },
    frameLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
    frame: { borderWidth: 2, borderColor: colors.textOnFixedDark },
    card: { width: '86%', aspectRatio: CARD_RATIO, borderRadius: radii.sm },
    face: { width: '62%', aspectRatio: 0.78, borderRadius: radii.full },
    wide: { width: '90%', aspectRatio: 4 / 3, borderRadius: radii.md },
    actions: { gap: spacing[3] },
  });
