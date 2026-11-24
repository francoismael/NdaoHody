import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppMap, useLocationPermission } from '@/shared/map';

// Sur Android, la boîte système a son propre texte : on explique donc AVANT de demander.
const WHY_LOCATION =
  "NdaoHody utilise ta position pour te montrer les trajets près de toi et définir tes points de départ et d'arrivée.";
const DENIED_LOCATION =
  "Position désactivée : la carte reste centrée sur Tana. Tu peux continuer à utiliser l'app.";

const GPS_OFF =
  'La localisation de ton téléphone est coupée : active-la pour voir ta position sur la carte.';

export function HomeScreen() {
  const { status, canAskAgain, request, servicesEnabled, enableServices } = useLocationPermission();

  return (
    <View style={styles.container}>
      <AppMap showUserLocation={status === 'granted' && servicesEnabled} />

      {status === 'undetermined' && (
        <LocationPanel text={WHY_LOCATION} action="Autoriser ma position" onPress={request} />
      )}
      {status === 'denied' && (
        <LocationPanel
          text={DENIED_LOCATION}
          action={canAskAgain ? 'Réessayer' : 'Ouvrir les réglages'}
          onPress={request}
        />
      )}
      {status === 'granted' && !servicesEnabled && (
        <LocationPanel text={GPS_OFF} action="Activer la localisation" onPress={enableServices} />
      )}
    </View>
  );
}

type LocationPanelProps = { text: string; action: string; onPress: () => void };

function LocationPanel({ text, action, onPress }: LocationPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelText}>{text}</Text>
      <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 4,
  },
  panelText: { fontSize: 15, marginBottom: 12, color: '#1f2937' },
  button: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
});
