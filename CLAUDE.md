# NdaoHody — règles du projet

Ces règles s'appliquent à tout le dépôt (back, mobile, back-office, libs).
Les règles propres à l'app mobile sont en plus dans `apps/mobile/CLAUDE.md`.

## Langue

- Noms de fichiers, dossiers, classes, fonctions, méthodes, variables et types : **toujours en anglais**.
- Documentation du code (commentaires, JSDoc) : **toujours en anglais**.
- Exception : la base de données (`donnees.sql` : tables et colonnes) et les data objects (`data-objets.ts` : objets et champs) **restent en français**. Le code qui les utilise garde ces noms tels quels.

## Pas de redondance

- Ne jamais dupliquer du code : une logique répétée devient une fonction, un composant ou un module partagé.
- Avant d'écrire du code, chercher s'il existe déjà dans le dépôt (`libs/shared`, services, utilitaires) et le réutiliser.

## Typage

- Ne jamais utiliser `any` : toujours typer correctement.
- Si le type est vraiment inconnu, utiliser `unknown` et le vérifier avant usage.
