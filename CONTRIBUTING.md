# Guide de contribution

## Installation

```bash
git clone <url-du-depot>
cd <nom-du-projet>
npm install
cp apps/back/.env.example apps/back/.env
cp apps/mobile/.env.example apps/mobile/.env
```

### Configurer le back (`apps/back/.env`)

Prérequis : PostgreSQL (avec PostGIS) et MongoDB installés et démarrés sur ton PC (pas de Docker).

1. **Base de données** : dans `DATABASE_URL`, mets ton utilisateur et ton mot de passe PostgreSQL, puis crée la base `ndaohody` si elle n'existe pas.

2. **Les 3 clés secrètes** : lance cette commande **3 fois**. Chaque fois, elle affiche une nouvelle valeur aléatoire :

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Colle la 1re valeur après `JWT_ACCESS_SECRET=`, la 2e après `JWT_ADMIN_SECRET=` et la 3e après `HASH_SECRET=` (sans espace ni guillemets).

   | Clé | Rôle |
   |---|---|
   | `JWT_ACCESS_SECRET` | Signe les jetons de connexion de l'app mobile |
   | `JWT_ADMIN_SECRET` | Signe les jetons de connexion du back-office |
   | `HASH_SECRET` | Protège les codes SMS et les jetons stockés en base, et signe les liens vers les photos de permis |

   Règles :
   - les 3 valeurs doivent être **différentes** et faire au moins 32 caractères, sinon le back refuse de démarrer ;
   - chaque développeur génère **ses propres clés** : ne les partage pas, ne les envoie à personne ;
   - en production, on génère d'autres clés **une seule fois**, à la mise en place du serveur, et on ne les change plus (sinon tout le monde est déconnecté).

3. **Mapbox** : `MAPBOX_ACCESS_TOKEN` = un token du compte Mapbox du projet (il commence par `pk.`). Demande-le au responsable du projet, par message privé. Sans lui, le back refuse de démarrer.

4. **Le reste** (`SMS_PROVIDER=log`, dossiers d'upload, etc.) peut garder les valeurs de `.env.example`. Avec `SMS_PROVIDER=log`, le code SMS de connexion s'affiche dans la console du back.

5. **Données de démonstration** (facultatif) :

   ```bash
   npm run db:migrate   # crée les tables (inutile si DB_MIGRATIONS_RUN=true)
   npm run db:seed      # charge les données de donnees.sql
   ```

   Compte super admin de démonstration : `superadmin@ndaohody.test` / `Ndaohody2026!`.
   Sans données de démonstration, crée ton premier super admin :

   ```bash
   npm run admin:create-super -- --email toi@ndaohody.mg --name "Ton Nom"
   ```

Lancer les projets :

```bash
npx nx serve back     # API NestJS (http://localhost:3000/api, docs : /api/docs)
npx nx start mobile   # App Expo (scanner le QR code avec Expo Go)
```

## Branches

| Branche | Rôle |
|---|---|
| `main` | Code stable (production). Uniquement par PR depuis `develop`. |
| `develop` | Intégration. Uniquement par PR depuis une branche de travail. |
| `feat/…`, `fix/…`, `docs/…` | Une branche par tâche, créée depuis `develop`. |

**Personne ne pousse directement sur `main` ni sur `develop`.**

### Nommage

`type/partie-description-courte`

- `feat/back-connexion-sms` : nouvelle fonctionnalité
- `fix/mobile-crash-connexion` : correction de bug
- `docs/roadmap-back` : documentation

Parties : `back`, `mobile`, `shared`.

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
