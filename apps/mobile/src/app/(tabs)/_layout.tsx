import { Tabs } from 'expo-router/js-tabs';

import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { TabBar, TabIcon } from '@/shared/ui';

/**
 * Une seule barre pour les deux rôles (onglets du PWA) :
 *  - passager : Accueil · Trajets · Messages · Profil ;
 *  - chauffeur : Accueil · Publier · Messages · Profil.
 * L'onglet de l'autre rôle est protégé ET caché : le rôle est un état.
 */
export default function TabsLayout() {
  const { isPassenger, isDriver } = useSession();
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tabs.Protected guard={isPassenger} redirectTo="/">
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Trajets',
            hidden: !isPassenger,
            tabBarIcon: ({ focused }) => <TabIcon name="trips" focused={focused} />,
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={isDriver} redirectTo="/">
        <Tabs.Screen
          name="publish"
          options={{
            title: 'Publier',
            hidden: !isDriver,
            tabBarIcon: ({ focused }) => <TabIcon name="publish" focused={focused} />,
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ focused }) => <TabIcon name="messages" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }}
      />
    </Tabs>
  );
}
