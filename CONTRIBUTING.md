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
   | `HASH_SECRET` | Protège les codes de connexion (WhatsApp / SMS) et les jetons stockés en base, et signe les liens vers les photos de permis |

   Règles :
   - les 3 valeurs doivent être **différentes** et faire au moins 32 caractères, sinon le back refuse de démarrer ;
   - chaque développeur génère **ses propres clés** : ne les partage pas, ne les envoie à personne ;
   - en production, on génère d'autres clés **une seule fois**, à la mise en place du serveur, et on ne les change plus (sinon tout le monde est déconnecté).

3. **Mapbox** : `MAPBOX_ACCESS_TOKEN` = un token du compte Mapbox du projet (il commence par `pk.`). Demande-le au responsable du projet, par message privé. Sans lui, le back refuse de démarrer.

4. **Le reste** (`SMS_PROVIDER=log`, `WHATSAPP_PROVIDER=log`, dossiers d'upload, etc.) peut garder les valeurs de `.env.example`. En mode `log`, le code de connexion n'est pas envoyé : il s'affiche dans la console du back, sur une ligne `[WhatsApp]` (canal par défaut) ou `[SMS]`.

   Pour tester le webhook WhatsApp en local (voir `apps/back/apiTests.txt`), mets aussi n'importe quelles valeurs dans `WHATSAPP_APP_SECRET` et `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Sans elles, le webhook refuse tout.

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

### Mettre en place le vrai WhatsApp (Meta)

Le code de connexion part par WhatsApp (API Cloud de Meta). Si Meta ne peut pas le livrer, le back envoie automatiquement un nouveau code par SMS. Cette mise en place est faite **une fois**, par le responsable du projet. Les autres développeurs restent en `WHATSAPP_PROVIDER=log`, sauf s'ils doivent tester le vrai envoi.

Les menus de Meta changent souvent : si un nom ne correspond pas, cherche l'équivalent.

**Ce qu'il faut avoir**

- Un compte Facebook personnel, pour administrer le compte de l'entreprise.
- Pour la mise en ligne seulement :
  - un **numéro dédié** à NdaoHody, qui n'est pas déjà utilisé dans WhatsApp ou WhatsApp Business et qui peut recevoir un SMS ou un appel ;
  - les **documents de l'entreprise** (statuts, NIF/STAT…) ;
  - une **carte bancaire**, car Meta facture chaque message d'authentification (voir sa grille tarifaire pour Madagascar).

#### Phase A — Essai avec le numéro de test de Meta (gratuit, en local)

1. **Compte Business** : sur business.facebook.com, crée le portefeuille d'entreprise « NdaoHody ».
2. **App** : sur developers.facebook.com, crée une app de type **Business** et relie-la au portefeuille NdaoHody.
3. **Produit WhatsApp** : ajoute-le à l'app. Meta crée un compte WhatsApp Business et donne un **numéro de test** gratuit.
4. **Destinataires** : dans WhatsApp > API Setup, ajoute ton numéro dans la liste « To » et confirme-le avec le code reçu. Le numéro de test n'écrit qu'aux numéros de cette liste.
5. **Identifiant du numéro** : sur la même page, copie le **Phone number ID** (pas le numéro lui-même) dans `WHATSAPP_PHONE_NUMBER_ID`.
6. **Modèle d'authentification** : dans WhatsApp Manager > Modèles de message, crée un modèle avec ces réglages :
   - catégorie **Authentication** ;
   - nom, par exemple `ndaohody_code_connexion` → `WHATSAPP_TEMPLATE_NAME` ;
   - langue **Français** → `WHATSAPP_TEMPLATE_LANGUAGE=fr` ;
   - bouton **« Copier le code »** : c'est le seul type de bouton que le back gère ;
   - mention de sécurité cochée, et expiration de **5 minutes** (la même durée que le back).

   Attends l'approbation, qui prend de quelques minutes à quelques heures.
7. **Token permanent** :
   - dans les paramètres de l'entreprise, ouvre « Utilisateurs système » et crée un utilisateur système **Admin** ;
   - ajoute-lui l'app et le compte WhatsApp, en contrôle total ;
   - génère un token pour l'app, avec les permissions `whatsapp_business_messaging` et `whatsapp_business_management` et l'expiration **Jamais**.

   Mets-le dans `WHATSAPP_ACCESS_TOKEN`. N'utilise pas le token temporaire d'API Setup : il expire au bout de 24 h.
8. **Clé secrète** : dans les paramètres de base de l'app, copie la **clé secrète** dans `WHATSAPP_APP_SECRET`. Elle sert à vérifier que les appels du webhook viennent bien de Meta.
9. **Jeton du webhook** : génère une valeur avec la même commande `node` que pour les clés secrètes, et mets-la dans `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
10. **Activer Meta dans le back** : mets `WHATSAPP_PROVIDER=meta` et redémarre le back. S'il manque une variable, il refuse de démarrer et dit laquelle.
11. **Webhook avec ngrok** :
    - lance `ngrok http 3000` ;
    - dans l'app Meta, ouvre WhatsApp > Configuration. URL de rappel : `https://<id>.ngrok-free.app/api/webhooks/whatsapp`. Jeton de vérification : la valeur de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` ;
    - clique sur « Vérifier et enregistrer », puis abonne le champ **messages**.
12. **Tester** :
    - `POST /api/v1/auth/otp` avec ton numéro : le code arrive sur WhatsApp ;
    - le même appel avec un numéro sans WhatsApp, qui doit aussi être dans la liste « To » : Meta renvoie `failed`, et une ligne `[SMS]` apparaît dans la console.

    Si aucun statut n'arrive sur le webhook, passe l'app en mode **Live**.

#### Phase B — Le vrai numéro (mise en ligne)

1. **Vérifier l'entreprise** : dans les paramètres de l'entreprise, ouvre le Centre de sécurité et envoie les documents. Sans cette vérification, Meta limite le nombre de destinataires par jour.
2. **Ajouter le vrai numéro** : dans WhatsApp Manager, ajoute le numéro dédié, vérifie-le, et fais valider le **nom affiché** « NdaoHody ».
3. **Paiement** : ajoute la carte bancaire sur le compte WhatsApp, sinon les messages ne partent pas.
4. **Identifiant du numéro** : mets celui du vrai numéro dans `WHATSAPP_PHONE_NUMBER_ID`. Le modèle déjà approuvé reste valable.
5. **Mode Live** : passe l'app en **Live**. Il faut pour cela une URL de politique de confidentialité dans les paramètres de base de l'app.
6. **Webhook de production** : remplace l'URL ngrok par `https://<domaine-du-serveur>/api/webhooks/whatsapp`. Meta exige du HTTPS.
7. **`.env` du serveur** : `NODE_ENV=production`, `WHATSAPP_PROVIDER=meta` et les 6 autres variables `WHATSAPP_`. Le token et la clé secrète ne vont jamais dans Git et ne s'envoient qu'en message privé.

> **Point bloquant pour la production** : le back refuse aussi `SMS_PROVIDER=log` en production. Tant qu'un vrai fournisseur SMS (Orange, Yas ou Airtel) n'est pas branché, le serveur de production ne démarre pas. Sans SMS, la bascule automatique ne servirait de toute façon à rien. En local, la phase A fonctionne déjà, avec les SMS affichés dans la console.

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
