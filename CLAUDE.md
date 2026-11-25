# NdaoHody — règles du projet

Ces règles s'appliquent à tout le dépôt (back, mobile, back-office, libs).
Les règles propres à l'app mobile sont en plus dans `apps/mobile/CLAUDE.md`.

## Langue

- Noms de fichiers, dossiers, classes, fonctions, méthodes, variables et types : **toujours en anglais**.
- Documentation du code (commentaires, JSDoc) : **toujours en anglais**.
- Exception : la base de données (`donnees.sql` : tables et colonnes) et les data objects (`data-objets.ts` : objets et champs) **restent en français**. Le code qui les utilise garde ces noms tels quels.

## Nommage des fichiers du back (`apps/back`)

- Un fichier qui contient une classe porte **le nom de la classe, en PascalCase** :
  - use case : `RequestOtpUseCase.ts`, `ChangeUserStatusUseCase.ts` (toujours le suffixe `UseCase`) ;
  - service : `SessionIssuerService.ts`, `AccountRecoveryService.ts` (toujours le suffixe `Service`, classe comprise) ;
  - et de même : `AuthController.ts`, `UserRepository.ts`, `TypeOrmUserRepository.ts`, `UserEntity.ts`,
    `SmsSenderAdapter.ts`, `AccessTokenGuard.ts`, `AdminApiModule.ts`, `Clock.ts` (port)…
- Les entités du domaine portent le nom de leur type : `User.ts`, `Vehicle.ts`, `DriverDocument.ts`.
- Plusieurs DTO d'un même sujet : nom au pluriel, `AuthRequests.ts`, `DriverResponses.ts`.
- `application/service/` ne contient **que** des classes `XxxService`. Les fonctions utilitaires et les constantes
  vont dans `application/helper/`, en camelCase : `durations.ts`, `bestEffort.ts`.
- Fichiers de config, scripts et fichiers de fonctions : camelCase (`environment.ts`, `dataSource.ts`, `createSuperAdmin.ts`).
- Exceptions : `main.ts`, les `index.ts`, et les migrations TypeORM (`<timestamp>-description.ts`).

## Tests

- **Jamais** de fichier de test (`.spec.ts`) dans `src/` : `src/` ne contient que le code.
- Les tests vont dans `apps/back/test/`, qui reprend l'arborescence de `src/` :
  `src/application/usecases/auth/RequestOtpUseCase.ts` → `test/application/usecases/auth/RequestOtpUseCase.spec.ts`.
- Les faux (ports et repositories en mémoire) sont dans `test/support/`.
- Les tests n'utilisent jamais de vraie base de données (la CI n'en a pas) : on remplace les ports par des faux.

## Pas de redondance

- Ne jamais dupliquer du code : une logique répétée devient une fonction, un composant ou un module partagé.
- Avant d'écrire du code, chercher s'il existe déjà dans le dépôt (`libs/shared`, services, utilitaires) et le réutiliser.

## Typage

- Ne jamais utiliser `any` : toujours typer correctement.
- Si le type est vraiment inconnu, utiliser `unknown` et le vérifier avant usage.
