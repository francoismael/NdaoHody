import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { useSession, useSessionReady } from '@/features/auth';
import { QueryProvider } from '@/shared/query';
import { useAppFonts, useTheme } from '@/shared/theme';

// Keep the splash screen until the font and the saved session are ready.
SplashScreen.preventAutoHideAsync();

/**
 * Règles d'accès (R1) : l'état décide, la navigation obéit.
 *  1. Déconnecté : seulement numéro → code → nom.
 *  2. Connecté : le parcours de connexion disparaît (historique compris).
 *  3. Rôle : les écrans d'un rôle sont protégés par ce rôle.
 *  4. Communs : protégés seulement par « connecté », un seul exemplaire.
 *  5. Dev : hors des gardes, retirés en R32.
 */
export default function RootLayout() {
  const fontsReady = useAppFonts();
  const theme = useTheme();
  const sessionReady = useSessionReady();
  const { signedIn, isPassenger, isDriver } = useSession();
  // Guards must not run before the saved session is read, or they redirect to /phone.
  const ready = fontsReady && sessionReady;

  // Fond de la fenêtre native : évite un flash blanc derrière les écrans en sombre.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryProvider>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontFamily: theme.fontFamilies.bold },
          headerShadowVisible: false,
        }}
      >
        {/* 1. Parcours non connecté */}
        <Stack.Protected guard={!signedIn} redirectTo="/">
          <Stack.Screen name="(auth)/phone" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/code" options={{ title: 'Code' }} />
          <Stack.Screen name="(auth)/name" options={{ title: 'Ton nom' }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn} redirectTo="/phone">
          {/* Onglets (une seule barre, onglets filtrés par rôle) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* 4. Communs aux deux rôles */}
          <Stack.Screen name="(common)/conversation/[id]" options={{ title: 'Conversation' }} />
          <Stack.Screen name="(common)/notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="(common)/rating/[id]" options={{ title: 'Notation', presentation: 'modal' }} />
          <Stack.Screen name="(common)/emergency" options={{ title: 'Urgences', presentation: 'modal' }} />

          {/* 3. Passager */}
          <Stack.Protected guard={isPassenger} redirectTo="/">
            <Stack.Screen name="(passenger)/search" options={{ title: 'Recherche' }} />
            <Stack.Screen name="(passenger)/results" options={{ title: 'Résultats' }} />
            <Stack.Screen name="(passenger)/driver/[id]" options={{ title: 'Chauffeur' }} />
            <Stack.Screen name="(passenger)/book/[id]" options={{ title: 'Réservation' }} />
            <Stack.Screen name="(passenger)/booking-wait/[id]" options={{ title: 'En attente' }} />
            <Stack.Screen name="(passenger)/ride/[id]" options={{ title: 'Course' }} />
          </Stack.Protected>

          {/* 3. Chauffeur */}
          <Stack.Protected guard={isDriver} redirectTo="/">
            <Stack.Screen name="(driver)/verification" options={{ title: 'Vérification' }} />
            <Stack.Screen name="(driver)/vehicle" options={{ title: 'Véhicule' }} />
            <Stack.Screen name="(driver)/pending-validation" options={{ title: 'Validation' }} />
            <Stack.Screen name="(driver)/publish-route" options={{ title: 'Publier' }} />
            <Stack.Screen name="(driver)/my-trips" options={{ title: 'Mes trajets' }} />
            <Stack.Screen name="(driver)/request/[id]" options={{ title: 'Demande' }} />
            <Stack.Screen name="(driver)/driving/[id]" options={{ title: 'Course' }} />
          </Stack.Protected>
        </Stack.Protected>

        {/* 5. Dev (PROVISOIRES) */}
        <Stack.Screen name="control" options={{ title: 'Contrôle (dev)' }} />
        <Stack.Screen name="theme-preview" options={{ title: 'Thème (dev)' }} />
        <Stack.Screen name="ui-preview" options={{ title: 'UI (dev)' }} />
      </Stack>
    </QueryProvider>
  );
}
