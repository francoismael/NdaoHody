import { useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, type TextInputInstance } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import type { TypeVehicule } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import {
  Button,
  ChoiceGroup,
  ErrorAnchor,
  FieldMessage,
  Flash,
  FormScreen,
  Stepper,
  TextField,
  type ChoiceOption,
  type FormScreenHandle,
} from '@/shared/ui';
import { isUserInputError } from '@/shared/utils';

import { DocumentCamera } from '../components/DocumentCamera';
import { useActiveVehicles, useCreateVehicle, useKeepPhoto, useUpdateVehicle, useVehicleSlots } from '../hooks/useVerification';
import { MAX_CAR_SEATS, VERIFICATION_MESSAGES as M, isValidSeatCount, normalizePlateNumber } from '../rules';

const TYPES: readonly ChoiceOption<TypeVehicule>[] = [
  { value: 'voiture', label: 'Voiture', icon: 'car' },
  { value: 'moto', label: 'Moto', icon: 'motorbike' },
];

/** Default seats when switching back to a car (PWA rule). */
const DEFAULT_CAR_SEATS = 3;

type Field = 'couleur' | 'immatriculation' | 'places' | 'photo';
type Errors = Partial<Record<Field, string>>;

/** Which field a message of the server belongs to (the rest goes in the banner). */
const FIELD_OF_MESSAGE: Record<string, Field> = {
  [M.plateInvalid]: 'immatriculation',
  [M.plateTaken]: 'immatriculation',
  [M.plateAlreadyMine]: 'immatriculation',
  [M.seatsInvalid]: 'places',
  [M.imageRequired]: 'photo',
  [M.colorRequired]: 'couleur',
};

/**
 * A vehicle (the sex is asked at sign-up, for everyone). First one: last step of the application,
 * then the waiting screen, which offers "Ajouter un autre véhicule" (3 at most, 26/11).
 * `then=back`: opened from the waiting screen or the profile, goes back there once saved.
 * `id`: change that vehicle (profile): its description only, as the back allows (not the plate,
 * the type or the photo). Every vehicle, new or changed, is checked by the team. Rules of the back: plate required
 * for every vehicle (GAP: optional for a motorbike in the PWA), a motorbike has 1 seat,
 * a car 1 to 8, a photo of the vehicle.
 */
export function VehicleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const { then, id } = useLocalSearchParams<{ then?: 'back'; id?: string }>();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const active = useActiveVehicles();
  const editing = id ? (active.data?.find((v) => v.id === Number(id)) ?? null) : null;
  const keepPhoto = useKeepPhoto();
  const slots = useVehicleSlots();

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
  const form = useRef<FormScreenHandle>(null);

  // Change mode: the form starts from the vehicle once it is loaded (adjusted while rendering, no effect).
  const [loadedId, setLoadedId] = useState<number | null>(null);
  if (editing && editing.id !== loadedId) {
    setLoadedId(editing.id);
    setType(editing.type);
    setMarque(editing.marque ?? '');
    setModele(editing.modele ?? '');
    setCouleur(editing.couleur);
    setPlaque(editing.immatriculation);
    setPlaces(editing.places);
    setPhotoUrl(editing.photoUrl);
  }

  const isMoto = type === 'moto';
  const sending = createVehicle.isPending || updateVehicle.isPending;

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
    if (Object.keys(found).length > 0 || !photoUrl) {
      form.current?.revealFirstError();
      return;
    }
    try {
      if (editing) {
        await updateVehicle.mutateAsync({ vehicleId: editing.id, marque: marque.trim() || null, modele: modele.trim() || null, couleur: couleur.trim(), places });
        if (router.canGoBack()) router.back();
        return;
      }
      await createVehicle.mutateAsync({
        type,
        marque: marque.trim() || null,
        modele: modele.trim() || null,
        couleur: couleur.trim(),
        immatriculation: normalizePlateNumber(plaque) ?? plaque,
        places,
        photoUrl,
      });
      if (then === 'back' && router.canGoBack()) router.back();
      else router.replace('/pending-validation');
    } catch (error) {
      const field = isUserInputError(error) ? FIELD_OF_MESSAGE[error.message] : undefined;
      const message = error instanceof Error ? error.message : 'Envoi impossible. Réessaie.';
      if (field) {
        setErrors({ [field]: message });
        form.current?.revealFirstError();
      }
      else setBanner(message);
    }
  };

  if (id && !editing) {
    return (
      <FormScreen
        title="Modifier un véhicule"
        footer={<Button label="Retour" icon="arrow-left" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      >
        {active.isPending ? <Text style={s.label}>Chargement…</Text> : <Flash tone="danger" message={M.vehicleNotFound} />}
      </FormScreen>
    );
  }

  // Already 3: say it before he types anything (the server refuses a 4th too).
  if (!editing && slots && !slots.canAdd && !createVehicle.isSuccess) {
    return (
      <FormScreen
        title="Tu as déjà 3 véhicules"
        subtitle={M.tooManyVehicles}
        footer={<Button label="Retour" icon="arrow-left" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      >
        {null}
      </FormScreen>
    );
  }

  const first = !editing && (slots?.count ?? 0) === 0;
  const title = editing ? 'Modifier ce véhicule' : first ? 'Ton véhicule' : `Véhicule ${(slots?.count ?? 0) + 1} sur ${slots?.max ?? 3}`;
  const subtitle = editing
    ? `${editing.immatriculation} · la plaque, le type et la photo ne changent pas.`
    : first
      ? 'Dernière étape : dis aux passagers dans quel véhicule ils montent.'
      : 'Un autre véhicule que tu conduis. L’équipe NdaoHody le vérifiera aussi.';
  const submitLabel = editing ? 'Enregistrer les modifications' : first ? 'Envoyer mon dossier' : 'Envoyer ce véhicule';
  return (
    <FormScreen
      ref={form}
      title={title}
      subtitle={subtitle}
      footer={<Button label={submitLabel} icon="check" loading={sending} disabled={editing?.enTrajet === true} onPress={() => void submit()} />}
    >
      {banner ? <Flash tone="danger" message={banner} /> : null}
      {editing?.enTrajet ? (
        <Flash tone="danger" message={`${M.vehicleInUse} Tu pourras le modifier une fois ce trajet terminé ou annulé.`} />
      ) : editing ? (
        <Flash message="Après tes modifications, l’équipe NdaoHody vérifiera de nouveau ce véhicule. D’ici là, tu ne pourras pas publier de trajet avec lui." />
      ) : null}

      {editing ? null : <ChoiceGroup label="Type de véhicule" options={TYPES} value={type} onChange={changeType} />}

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
      {editing ? null : (
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
      )}
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

      {editing ? null : (
        <ErrorAnchor hasError={Boolean(errors.photo)} style={s.photoBlock}>
          <Text style={s.label}>Photo du véhicule</Text>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={s.photo} accessibilityLabel="Photo de ton véhicule" /> : null}
          <Button
            label={photoUrl ? 'Reprendre la photo' : 'Prendre la photo'}
            icon="camera"
            variant="secondary"
            onPress={() => setCapturing(true)}
          />
          {errors.photo ? <FieldMessage tone="danger" message={errors.photo} /> : null}
        </ErrorAnchor>
      )}
    </FormScreen>
  );
}

const createStyles = ({ colors, typography, spacing, radii }: Theme) =>
  StyleSheet.create({
    photoBlock: { gap: spacing[2] },
    label: { ...typography.bodyStrong, color: colors.text },
    photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.md, backgroundColor: colors.fill },
  });
