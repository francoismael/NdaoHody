import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { TypeTrajet } from '@contract';

import { Button, ChoiceGroup, Flash, FormScreen, type ChoiceOption, type FormScreenHandle } from '@/shared/ui';
import { currentTimeMs } from '@/shared/utils';

import { DepartureTimePicker, nextQuarter } from '../components/DepartureTimePicker';
import { useRoutePreview } from '../hooks/useTrips';
import { PUBLISH_MESSAGES as M, departureProblem } from '../rules';

const WHEN: readonly ChoiceOption<TypeTrajet>[] = [
  { value: 'immediat', label: 'Maintenant' },
  { value: 'a_l_avance', label: 'Plus tard' },
];

/** Publish, step 2 of 3: now (default) or a planned day and hour, checked on the demo clock. */
export function PublishRouteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ departId: string; arriveeId: string }>();
  const departId = Number(params.departId);
  const arriveeId = Number(params.arriveeId);
  const route = useRoutePreview(departId, arriveeId);
  const form = useRef<FormScreenHandle>(null);

  const [type, setType] = useState<TypeTrajet>('immediat');
  const [departure, setDeparture] = useState(() => nextQuarter(currentTimeMs()));
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (type === 'a_l_avance') {
      const problem = departureProblem(departure, currentTimeMs());
      if (problem) {
        setError(problem === 'past' ? M.pastDeparture : M.tooFarAhead);
        form.current?.revealFirstError();
        return;
      }
    }
    router.push({
      pathname: '/publish-seats',
      params: { departId: params.departId, arriveeId: params.arriveeId, type, ...(type === 'a_l_avance' ? { dateDepart: String(departure) } : {}) },
    });
  };

  return (
    <FormScreen
      ref={form}
      title="Quand pars-tu ?"
      subtitle={route.data ? `Étape 2 sur 3 · ${route.data.depart.libelle} → ${route.data.arrivee.libelle}` : 'Étape 2 sur 3'}
      footer={<Button label="Continuer" onPress={next} disabled={!route.data} />}
    >
      {route.isError ? <Flash tone="danger" message={route.error.message} /> : null}
      <ChoiceGroup
        label="Départ"
        options={WHEN}
        value={type}
        onChange={(value) => {
          setType(value);
          setError(null);
          // Back to "later": never start from an hour already gone on the demo clock.
          if (value === 'a_l_avance' && departure <= currentTimeMs()) setDeparture(nextQuarter(currentTimeMs()));
        }}
        hint={type === 'immediat' ? 'Tu pars dès la publication : les passagers sur ton chemin te voient tout de suite.' : undefined}
      />
      {type === 'a_l_avance' ? (
        <DepartureTimePicker
          value={departure}
          now={currentTimeMs()}
          error={error}
          onChange={(value) => {
            setDeparture(value);
            setError(null);
          }}
        />
      ) : null}
    </FormScreen>
  );
}
