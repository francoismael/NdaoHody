import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';

import { fontFamilies } from './typography';

/**
 * Charge Inter au démarrage (fichiers .ttf statiques, une graisse par fichier).
 * Import par graisse : seuls ces 5 fichiers entrent dans le bundle, pas les 18.
 * Plus tard, au prochain rebuild (notifications), on pourra les embarquer
 * via le plugin expo-font pour supprimer ce temps de chargement.
 *
 * Renvoie `true` quand la police est prête OU a échoué (repli sur la police
 * système plutôt qu'un écran de démarrage bloqué).
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fontFamilies.regular]: Inter_400Regular,
    [fontFamilies.medium]: Inter_500Medium,
    [fontFamilies.semiBold]: Inter_600SemiBold,
    [fontFamilies.bold]: Inter_700Bold,
    [fontFamilies.extraBold]: Inter_800ExtraBold,
  });
  if (error) console.warn('[theme] Inter non chargée :', error.message);
  return loaded || error !== null;
}
