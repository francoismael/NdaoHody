import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { Vehicule } from '@contract';

import { useTheme, type Theme } from '@/shared/theme';
import { Button, Flash, Tag } from '@/shared/ui';

import { VehicleCard } from '../components/VehicleCard';
import { useActiveVehicles, useArchiveVehicle, useUpdateVehicle, useVehicleSlots } from '../hooks/useVerification';
import { VERIFICATION_MESSAGES as M } from '../rules';
import { STATUS_TAGS } from '../statusTags';

/**
 * Profile → "Mes véhicules" (26/11): the driver's vehicles (3 at most), each with the team's answer.
 * Add (while under 3), change (the description only; checked again by the team), delete
 * (archived by the server, refused while a trip uses it). No native Alert: deleting asks twice here.
 */
export function MyVehiclesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const vehicles = useActiveVehicles();
  const slots = useVehicleSlots();
  const archive = useArchiveVehicle();
  const update = useUpdateVehicle();
  const [confirming, setConfirming] = useState<number | null>(null);
  /** The vehicle being made the default one: its badge spins until the list says it is. */
  const [settingDefault, setSettingDefault] = useState<number | null>(null);
  if (settingDefault !== null && vehicles.data?.find((v) => v.id === settingDefault)?.parDefaut) setSettingDefault(null);

  if (vehicles.isPending) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Chargement de tes véhicules" />
      </View>
    );
  }

  const list = vehicles.data ?? [];
  const edit = (vehicle: Vehicule) => router.push({ pathname: '/vehicle', params: { id: String(vehicle.id), then: 'back' } });
  const remove = (vehicle: Vehicule) =>
    archive.mutate(vehicle.id, {
      onSettled: () => setConfirming(null),
    });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.lead}>
        {slots ? `${slots.count} véhicule${slots.count > 1 ? 's' : ''} sur ${slots.max}. ` : ''}
        Chaque ajout ou modification est vérifié par l’équipe NdaoHody avant de servir pour un trajet.
      </Text>

      {vehicles.isError ? <Flash tone="danger" message={vehicles.error.message} /> : null}
      {archive.error ? <Flash tone="danger" message={archive.error.message} /> : null}
      {update.error ? <Flash tone="danger" message={update.error.message} /> : null}

      {list.map((vehicle) => {
        const tag = STATUS_TAGS[vehicle.statut];
        return (
          <VehicleCard key={vehicle.id} vehicle={vehicle}>
            <View style={s.tags}>
              <Tag label={tag.label} tone={tag.tone} icon={vehicle.statut === 'refuse' ? 'alert-circle' : vehicle.statut === 'valide' ? 'check' : undefined} />
              {/* The default one is offered first when publishing and shown on the public profile. */}
              {vehicle.parDefaut ? (
                <Tag label="Par défaut" icon="info-circle" />
              ) : (
                <Tag
                  label="Définir par défaut"
                  loading={settingDefault === vehicle.id}
                  onPress={() => {
                    setSettingDefault(vehicle.id);
                    update.mutate({ vehicleId: vehicle.id, parDefaut: true }, { onError: () => setSettingDefault(null) });
                  }}
                />
              )}
            </View>
            {vehicle.motifRefus ? <Text style={s.motif}>Motif : {vehicle.motifRefus}</Text> : null}
            {confirming === vehicle.id ? (
              <View style={s.actions}>
                <Text style={s.meta}>Supprimer {vehicle.immatriculation} ? Tu pourras en ajouter un autre à la place.</Text>
                <Button label="Oui, supprimer" icon="trash" variant="danger" loading={archive.isPending} onPress={() => remove(vehicle)} />
                <Button label="Garder ce véhicule" variant="ghost" onPress={() => setConfirming(null)} />
              </View>
            ) : (
              <View style={s.buttons}>
                <Button label="Modifier" icon="pencil" variant="secondary" width="auto" onPress={() => edit(vehicle)} />
                <Button
                  label="Supprimer"
                  icon="trash"
                  variant="ghost"
                  width="auto"
                  onPress={() => {
                    archive.reset();
                    setConfirming(vehicle.id);
                  }}
                />
              </View>
            )}
          </VehicleCard>
        );
      })}

      {slots?.canAdd ? (
        <Button
          label={`Ajouter un véhicule (${slots.count}/${slots.max})`}
          icon="car"
          onPress={() => router.push({ pathname: '/vehicle', params: { then: 'back' } })}
        />
      ) : slots ? (
        <Text style={s.lead}>{M.tooManyVehicles}</Text>
      ) : null}
    </ScrollView>
  );
}

const createStyles = ({ colors, typography, spacing, gutter }: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { padding: gutter, gap: spacing[4], paddingBottom: spacing[10] },
    lead: { ...typography.small, color: colors.textMuted },
    meta: { ...typography.small, color: colors.textMuted },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
    motif: { ...typography.small, color: colors.danger },
    buttons: { flexDirection: 'row', gap: spacing[2] },
    actions: { gap: spacing[2] },
  });
