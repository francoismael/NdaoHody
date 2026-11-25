import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, type TextInputInstance } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import type { Sexe, TypeVehicule } from '@contract';

import { useMe, useUpdateMe } from '@/features/profile';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, ChoiceGroup, FieldMessage, Flash, FormScreen, Stepper, TextField, type ChoiceOption } from '@/shared/ui';
import { isUserInputError } from '@/shared/utils';

import { DocumentCamera } from '../components/DocumentCamera';
import { useCreateVehicle, useKeepPhoto } from '../hooks/useVerification';
import { MAX_CAR_SEATS, VERIFICATION_MESSAGES as M, isValidSeatCount, normalizePlateNumber } from '../rules';

const SEXES: readonly ChoiceOption<Sexe>[] = [
  { value: 'homme', label: 'Homme', icon: 'gender-male' },
  { value: 'femme', label: 'Femme', icon: 'gender-female' },
];

const TYPES: readonly ChoiceOption<TypeVehicule>[] = [
  { value: 'voiture', label: 'Voiture', icon: 'car' },
  { value: 'moto', label: 'Moto', icon: 'motorbike' },
];

/** Default seats when switching back to a car (PWA rule). */
const DEFAULT_CAR_SEATS = 3;

type Field = 'sexe' | 'couleur' | 'immatriculation' | 'places' | 'photo';
type Errors = Partial<Record<Field, string>>;

/** Which field a message of the server belongs to (the rest goes in the banner). */
const FIELD_OF_MESSAGE: Record<string, Field> = {
  [M.plateInvalid]: 'immatriculation',
  [M.plateTaken]: 'immatriculation',
  [M.plateAlreadyMine]: 'immatriculation',
  [M.seatsInvalid]: 'places',
  [M.imageRequired]: 'photo',
  [M.sexLocked]: 'sexe',
  [M.colorRequired]: 'couleur',
};

/**
 * Vehicle and sex (asked here, and only here). Rules of the back: plate required
 * for every vehicle (GAP: optional for a motorbike in the PWA), a motorbike has 1 seat,
 * a car 1 to 8, a photo of the vehicle. The sex cannot be changed once saved.
 */
export function VehicleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const me = useMe();
  const updateMe = useUpdateMe();
  const createVehicle = useCreateVehicle();
  const keepPhoto = useKeepPhoto();

  const [sexe, setSexe] = useState<Sexe | null>(null);
  const [type, setType] = useState<TypeVehicule>('voiture');
  const [marque, setMarque] = useState('');
  const [modele, setModele] = useState('');
  const [couleur, setCouleur] = useState('');
  const [plaque, setPlaque] = useState('');
  const [places, setPlaces] = useState(DEFAULT_CAR_SEATS);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const modelRef = useRef<TextInputInstance>(null);
  const colorRef = useRef<TextInputInstance>(null);
  const plateRef = useRef<TextInputInstance>(null);

  if (me.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement" />
      </View>
    );
  }

  if (me.isError) {
    return (
      <View style={[s.screen, s.padded]}>
        <Flash tone="danger" message={me.error.message} />
        <Button label="Réessayer" icon="refresh" variant="secondary" onPress={() => void me.refetch()} />
      </View>
    );
  }

  const savedSexe = me.data.sexe;
  const chosenSexe = savedSexe ?? sexe;
  const isMoto = type === 'moto';
  const sending = updateMe.isPending || createVehicle.isPending;

  const clear = (field: Field): void => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setBanner(null);
  };

  const changeType = (next: TypeVehicule): void => {
    setType(next);
    // A motorbike carries one passenger; back to a car: 3 seats.
    setPlaces(next === 'moto' ? 1 : places === 1 ? DEFAULT_CAR_SEATS : places);
    clear('places');
  };

  if (capturing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DocumentCamera
          kind="vehicule"
          sending={keepPhoto.isPending}
          error={keepPhoto.error?.message ?? null}
          onAccept={(temporaryUri) =>
            keepPhoto.mutate(
              { temporaryUri, name: 'vehicule' },
              {
                onSuccess: (uri) => {
                  setPhotoUrl(uri);
                  clear('photo');
                  setCapturing(false);
                },
              },
            )
          }
        />
      </>
    );
  }

  const validate = (): Errors => {
    const found: Errors = {};
    if (!chosenSexe) found.sexe = 'Choisis Homme ou Femme.';
    if (!couleur.trim()) found.couleur = M.colorRequired;
    if (!normalizePlateNumber(plaque)) found.immatriculation = M.plateInvalid;
    if (!isValidSeatCount(type, places)) found.places = M.seatsInvalid;
    if (!photoUrl) found.photo = 'Prends une photo de ton véhicule.';
    return found;
  };

  const submit = async (): Promise<void> => {
    if (sending) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !photoUrl || !chosenSexe) return;
    try {
      if (!savedSexe) await updateMe.mutateAsync({ sexe: chosenSexe });
      await createVehicle.mutateAsync({
        type,
        marque: marque.trim() || null,
        modele: modele.trim() || null,
        couleur: couleur.trim(),
        immatriculation: normalizePlateNumber(plaque) ?? plaque,
        places,
        photoUrl,
      });
      router.replace('/pending-validation');
    } catch (error) {
      const field = isUserInputError(error) ? FIELD_OF_MESSAGE[error.message] : undefined;
      const message = error instanceof Error ? error.message : 'Envoi impossible. Réessaie.';
      if (field) setErrors({ [field]: message });
      else setBanner(message);
    }
  };

  return (
    <FormScreen
      title="Ton véhicule"
      subtitle="Dernière étape : dis aux passagers dans quel véhicule ils montent."
      footer={<Button label="Envoyer mon dossier" icon="check" loading={sending} onPress={() => void submit()} />}
    >
      {banner ? <Flash tone="danger" message={banner} /> : null}

      <ChoiceGroup
        label="Tu es"
        options={SEXES}
        value={chosenSexe}
        onChange={(value) => {
          setSexe(value);
          clear('sexe');
        }}
        disabled={savedSexe !== null}
        error={errors.sexe}
        hint={
          savedSexe
            ? 'Déjà enregistré. Pour le changer, contacte le support NdaoHody.'
            : 'Jamais montré aux autres : il sert aux trajets réservés aux femmes. Il ne pourra plus être modifié.'
        }
      />

      <ChoiceGroup label="Type de véhicule" options={TYPES} value={type} onChange={changeType} />

      <TextField
        label="Marque (facultatif)"
        value={marque}
        onChangeText={setMarque}
        placeholder={isMoto ? 'Yamaha' : 'Toyota'}
        maxLength={50}
        returnKeyType="next"
        onSubmitEditing={() => modelRef.current?.focus()}
      />
      <TextField
        ref={modelRef}
        label="Modèle (facultatif)"
        value={modele}
        onChangeText={setModele}
        placeholder={isMoto ? 'YBR' : 'Vitz'}
        maxLength={50}
        returnKeyType="next"
        onSubmitEditing={() => colorRef.current?.focus()}
      />
      <TextField
        ref={colorRef}
        label="Couleur"
        value={couleur}
        onChangeText={(text) => {
          setCouleur(text);
          clear('couleur');
        }}
        error={errors.couleur}
        placeholder="Grise"
        maxLength={30}
        returnKeyType="next"
        onSubmitEditing={() => plateRef.current?.focus()}
      />
      <TextField
        ref={plateRef}
        label="Plaque d’immatriculation"
        kind="reference"
        value={plaque}
        onChangeText={(text) => {
          setPlaque(text.toUpperCase());
          clear('immatriculation');
        }}
        error={errors.immatriculation}
        hint="Obligatoire, même pour une moto. Visible seulement par tes passagers, après leur réservation."
        placeholder="2341 TBA"
        maxLength={20}
      />
      <Stepper
        label={isMoto ? 'Places passagers (une moto : 1 passager)' : 'Places passagers (hors chauffeur)'}
        value={places}
        min={1}
        max={MAX_CAR_SEATS}
        onChange={(value) => {
          setPlaces(value);
          clear('places');
        }}
        disabled={isMoto}
        error={errors.places}
      />

      <View style={s.photoBlock}>
        <Text style={s.label}>Photo du véhicule</Text>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={s.photo} accessibilityLabel="Photo de ton véhicule" /> : null}
        <Button
          label={photoUrl ? 'Reprendre la photo' : 'Prendre la photo'}
          icon="camera"
          variant="secondary"
          onPress={() => setCapturing(true)}
        />
        {errors.photo ? <FieldMessage tone="danger" message={errors.photo} /> : null}
      </View>
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, gutter, radii }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    padded: { padding: gutter, gap: spacing[4] },
    photoBlock: { gap: spacing[2] },
    label: { ...typography.bodyStrong, color: colors.text },
    photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.fill },
  });
