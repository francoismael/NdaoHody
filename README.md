# NdaoHody

Covoiturage à Antananarivo. Monorepo Nx :

| Dossier | Contenu |
|---|---|
| `apps/back` | API NestJS (application native + back-office) |
| `apps/mobile` | Application Expo / React Native |
| `libs/shared` | Code partagé |

Règles de code : [CLAUDE.md](CLAUDE.md) · Contribution : [CONTRIBUTING.md](CONTRIBUTING.md) · Roadmap du back : [ROADMAP-BACK.md](ROADMAP-BACK.md)

## Installation du back (une seule fois)

### 1. Prérequis

- Node.js 26 (voir `.nvmrc`)
- PostgreSQL + **PostGIS** (Stack Builder → Spatial Extensions → PostGIS)
- MongoDB Community Server (installé comme service)

### 2. Base PostgreSQL

```powershell
psql -U postgres -c "CREATE DATABASE ndaohody"
```

### 3. Dépendances et configuration

```powershell
npm install
Copy-Item apps\back\.env.example apps\back\.env
```

Dans `apps/back/.env`, remplacer `PASSWORD` par votre mot de passe PostgreSQL. Le `.env` n'est jamais commité.

### 4. Tables et données de démonstration

```powershell
npm run db:migrate   # crée les tables
npm run db:seed      # charge les données de démonstration (vide les tables avant)
```

### 5. Lancer et vérifier

```powershell
npx nx serve back
```

http://localhost:3000/api/health doit répondre `{"postgres":"ok","mongodb":"ok"}`.

## Base de données au quotidien

| Je veux… | Commande |
|---|---|
| Appliquer les nouvelles migrations après un `git pull` | Rien : elles s'appliquent au démarrage du back (`DB_MIGRATIONS_RUN=true`). Sinon : `npm run db:migrate` |
| Annuler la dernière migration | `npm run db:revert` |
| Remettre les données de démonstration | `npm run db:seed` |

### Ajouter une migration

1. Créer un fichier dans `apps/back/src/infrastructure/persistence/postgres/migrations/`, nommé `<horodatage>-<description>.ts` (ex. `1795564800000-add-vehicle-year.ts`), sur le modèle de la migration initiale.
2. L'ajouter à la liste `MIGRATIONS` de `migrations/index.ts`.
3. Ne jamais modifier une migration déjà fusionnée : en créer une nouvelle.
