import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MAX_CAR_SEATS } from '@/features/verification';
import { haversineMeters } from '@/shared/map';
import { useTheme, type Theme } from '@/shared/theme';
import { Button, ChoiceGroup, FieldMessage, FormScreen, Stepper, type ChoiceOption, type FormScreenHandle } from '@/shared/ui';
import { currentTimeMs } from '@/shared/utils';

import { toChosenPlace, useDemoPosition, useNearestPlace } from '../hooks/useTrips';
import { MIN_TRIP_METRES, SEARCH_MESSAGES as M, departureProblem } from '../rules';
import type { ChosenPlace, SearchCriteria } from '../types';
import { DepartureTimePicker, nextQuarter } from './DepartureTimePicker';
import { PlaceField } from './PlaceField';
import { PlacePicker } from './PlacePicker';

type When = 'maintenant' | 'plus_tard';

const WHEN: readonly ChoiceOption<When>[] = [
  { value: 'maintenant', label: 'Maintenant' },
  { value: 'plus_tard', label: 'Plus tard' },
];

type Picking = 'depart' | 'destination' | null;

type Errors = { depart?: string; destination?: string; when?: string };

export type SearchFormProps = {
  /** null: first search (my position, now, 1 seat). Else the criteria to edit, prefilled. */
  initial: SearchCriteria | null;
  onSubmit: (criteria: SearchCriteria) => void;
  /** Editing only: back to the results without changing anything. */
  onCancel?: () => void;
};

/**
 * THE search form (block 5): used for the first search and, prefilled, to change it from
 * the summary under the results. Departure (my position or a place), destination, seats, when.
 */
export function SearchForm({ initial, onSubmit, onCancel }: SearchFormProps) {
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const form = useRef<FormScreenHandle>(null);

  // Like publish: "my position" = the known place nearest the demo position.
  const here = useDemoPosition();
  const nearest = useNearestPlace(here);
  const currentPlace = useMemo(() => (nearest.data ? toChosenPlace(nearest.data) : null), [nearest.data]);

  const [fromCurrent, setFromCurrent] = useState(initial?.fromCurrent ?? true);
  const [chosenDepart, setChosenDepart] = useState<ChosenPlace | null>(initial && !initial.fromCurrent ? initial.depart : null);
  const [destination, setDestination] = useState<ChosenPlace | null>(initial?.destination ?? null);
  const [places, setPlaces] = useState(initial?.places ?? 1);
  const [when, setWhen] = useState<When>(initial?.later != null ? 'plus_tard' : 'maintenant');
  const [later, setLater] = useState(() => initial?.later ?? nextQuarter(currentTimeMs()));
  const [picking, setPicking] = useState<Picking>(null);
  const [errors, setErrors] = useState<Errors>({});

  const depart = fromCurrent ? currentPlace : chosenDepart;
  const currentProblem = fromCurrent && nearest.isError ? nearest.error.message : null;

  const submit = () => {
    const next: Errors = {};
    if (!depart) next.depart = currentProblem ?? 'Choisis ton départ.';
    if (!destination) next.destination = M.noDestination;
    else if (depart && haversineMeters([depart.longitude, depart.latitude], [destination.longitude, destination.latitude]) < MIN_TRIP_METRES) {
      next.destination = M.samePlace;
    }
    if (when === 'plus_tard' && departureProblem(later, currentTimeMs()) === 'past') next.when = M.pastTime;
    setErrors(next);
    if (Object.keys(next).length > 0 || !depart || !destination) {
      form.current?.revealFirstError();
      return;
    }
    onSubmit({ fromCurrent, depart, destination, places, later: when === 'plus_tard' ? later : null });
  };

  return (
    <FormScreen
      ref={form}
      title={initial ? 'Modifier la recherche' : 'Où vas-tu ?'}
      subtitle="Les chauffeurs qui passent par ton départ, puis par ta destination."
      footer={
        <View style={s.footer}>
          <Button label="Rechercher" icon="search" onPress={submit} />
          {onCancel ? <Button label="Annuler" variant="ghost" onPress={onCancel} /> : null}
        </View>
      }
    >
      <PlaceField
        label="Départ"
        value={depart ? (fromCurrent ? `Ma position · ${depart.libelle}` : depart.libelle) : fromCurrent ? 'Ma position…' : 'Choisir'}
        onPress={() => setPicking('depart')}
      />
      {errors.depart ? <FieldMessage tone="danger" message={errors.depart} /> : null}
      <PlaceField label="Destination" value={destination?.libelle ?? 'Choisir'} onPress={() => setPicking('destination')} />
      {errors.destination ? <FieldMessage tone="danger" message={errors.destination} /> : null}

      <Stepper label="Places" value={places} min={1} max={MAX_CAR_SEATS} onChange={setPlaces} hint="Le prix affiché est pour toutes ces places." />

      <ChoiceGroup
        label="Quand"
        options={WHEN}
        value={when}
        onChange={(value) => {
          setWhen(value);
          setErrors((e) => ({ ...e, when: undefined }));
          // Back to "later": never start from an hour already gone on the demo clock.
          if (value === 'plus_tard' && later <= currentTimeMs()) setLater(nextQuarter(currentTimeMs()));
        }}
      />
      {when === 'plus_tard' ? (
        <DepartureTimePicker
          value={later}
          now={currentTimeMs()}
          error={errors.when}
          onChange={(value) => {
            setLater(value);
            setErrors((e) => ({ ...e, when: undefined }));
          }}
        />
      ) : null}

      <PlacePicker
        visible={picking === 'depart'}
        title="D’où pars-tu ?"
        near={here}
        selected={depart}
        current={{
          place: currentPlace,
          problem: currentProblem,
          onSelect: () => {
            setFromCurrent(true);
            setErrors((e) => ({ ...e, depart: undefined }));
            setPicking(null);
          },
        }}
        onSelect={(place) => {
          setFromCurrent(false);
          setChosenDepart(place);
          setErrors((e) => ({ ...e, depart: undefined }));
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
      <PlacePicker
        visible={picking === 'destination'}
        title="Où vas-tu ?"
        near={here}
        selected={destination}
        onSelect={(place) => {
          setDestination(place);
          setErrors((e) => ({ ...e, destination: undefined }));
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </FormScreen>
  );
}

const createStyles = ({ spacing }: Theme) =>
  StyleSheet.create({
    footer: { gap: spacing[2] },
  });
