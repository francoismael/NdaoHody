# Guide de contribution

## Installation

```bash
git clone <url-du-depot>
cd <nom-du-projet>
npm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Lancer les projets :

```bash
npx nx serve api      # API NestJS
npx nx start mobile   # App Expo (scanner le QR code avec Expo Go)
```

## Branches

| Branche | Rôle |
|---|---|
| `main` | Code stable (production). Uniquement par PR depuis `develop`. |
| `develop` | Intégration. Uniquement par PR depuis une branche de travail. |
| `feature/…`, `fix/…`, etc. | Une branche par tâche, créée depuis `develop`. |

**Personne ne pousse directement sur `main` ni sur `develop`.**

### Nommage

`type/scope-description-courte`

- `feature/api-auth-jwt`
- `fix/mobile-login-crash`
- `refactor/shared-types-user`
- `chore/update-nx`
- `docs/readme-installation`
- `hotfix/api-crash-paiement` (depuis `main`, urgence production)

Scopes : `api`, `mobile`, `web`, `shared`.

## Cycle de travail

```bash
# 1. Partir de develop à jour
git checkout develop
git pull

# 2. Créer sa branche
git checkout -b feature/mobile-ecran-login

# 3. Commiter
git add .
git commit -m "ajout écran de connexion"

# 4. Se mettre à jour avant de pousser
git fetch origin
git rebase origin/develop

# 5. Vérifier
npx nx affected -t lint test build

# 6. Pousser
git push -u origin feature/mobile-ecran-login
```

Puis ouvrir une **Pull Request vers `develop`** sur GitHub, demander une relecture, et fusionner en **Squash and merge** une fois approuvée.

## Règles d'équipe

1. Une branche = une tâche.
2. Branches courtes (quelques jours maximum).
3. `git pull` sur `develop` chaque matin.
4. Jamais de `.env`, de secrets ni de `node_modules` dans un commit.
5. Toujours tester avant d'ouvrir une PR.
6. Lier chaque PR à son issue (`Closes #12`).
7. Installer les paquets Expo avec `npx expo install <paquet>`.
