# App mobile NdaoHody — règles

## Contexte
- Expo SDK 58 · React Native 0.88 · Expo Router · TypeScript strict
- Monorepo Nx, npm. Versions déclarées dans le package.json RACINE ; apps/mobile garde des "*".
- Installer : `npx expo install <pkg>` depuis la racine. Jamais `nx install mobile`, jamais `--force`.
- Nouveau paquet : installé à la racine + déclaré "*" dans apps/mobile/package.json (sinon absent du build natif).

## Structure de src/
- app/ : routes uniquement. Un fichier = une enveloppe qui affiche un écran de features/. Aucune logique.
- features/<domaine>/ : screens/, components/, hooks/, services/, types.ts, index.ts (vitrine publique).
- shared/ : ui, theme, map, utils. Ignore le métier.
- core/ : mock + simulation (faux serveur), état global, push. La régie.

## Domaines
auth · profile · verification · trips · bookings · messages · notifications · reviews · safety · pricing

## Règle de dépendance
écran → hook → service → core/mock (aujourd'hui) | API (demain)
- Un écran n'importe JAMAIS un service ni core/mock.
- Seuls les services touchent core/mock.
- Exception unique : la route dev `app/demo.tsx` affiche `core/demo/DemoPanel` (panneau de régie, pas un écran métier ; il passe par les routes simulées).
- shared n'importe rien de features ni de core.
- core n'importe que shared, et les fichiers `types.ts` et `rules.ts` des domaines (jamais leur index.ts).
- Une règle métier pure utilisée par les écrans ET le faux serveur (ex. seuil de 500 m) vit dans `features/<domaine>/rules.ts`, sans import.
- Entre domaines : uniquement via index.ts, sans boucle.
- Pas de dossier vide "au cas où" : un dossier naît avec son premier fichier.

## Risques connus
- Chemin du projet : 23 caractères (chemins longs Windows activés) → surveiller le build Android.
- @nx/expo a du retard sur les SDK : Nx sert seulement de lanceur (`expo …`).
- CI : mobile exclu du build (--exclude=mobile) → réactiver quand EAS sera configuré
- Point d'entrée : `index.js` → `import 'expo-router/entry'` ("main": "index.js"). Ne pas remettre "main": "expo-router/entry" : sans workspaces npm, Metro le cherche dans apps/mobile/node_modules et l'app reste figée sur le splash.

## Architecture 
src/
├── app/        routes uniquement (enveloppes fines)
├── features/   les 10 domaines métier
├── shared/     ui, theme, map, utils — ignore le métier
└── core/       mock + simulation, état global, push — la régie