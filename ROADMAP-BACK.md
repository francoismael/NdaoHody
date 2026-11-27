# Roadmap du back-end Ndaohody

Back unique pour l'**application native** et le **back-office**, dans `apps/back` (NestJS, monorepo Nx).

| Élément | Choix |
|---|---|
| Base principale | PostgreSQL + PostGIS (tables de [donnees.sql](donnees.sql)) |
| Notifications push | MongoDB (historique, jetons FCM, file d'envoi) + Firebase Cloud Messaging |
| Cartes | Mapbox (chemin le plus court, temps d'arrivée, noms des lieux) |
| Temps réel | WebSocket (Socket.IO) |
| Objets échangés avec le front | [data-objets.ts](data-objets.ts) |

Ordre de travail : on suit les étapes dans l'ordre. Une tâche = une branche `feature/api-...` depuis `develop` + une PR (voir [CONTRIBUTING.md](CONTRIBUTING.md)). Une étape est finie quand toutes ses cases sont cochées, testées et documentées dans Swagger.

---

## Vue d'ensemble

| # | Étape | Résultat |
|---|---|---|
| 0 | Socle | Le serveur démarre avec PostgreSQL et MongoDB |
| 1 | Connexion par SMS | Un utilisateur se connecte avec son numéro |
| 2 | Profil et mode | Il complète son profil et bascule passager / chauffeur |
| 3 | Back-office : comptes et rôles | super_admin, admin, investisseur se connectent |
| 4 | Devenir chauffeur | Documents + véhicules validés par un admin |
| 5 | Cartes (Mapbox) | Chemin, distance, temps d'arrivée |
| 6 | Publier un trajet | À l'avance ou immédiat |
| 7 | Rechercher | « Le chauffeur passe sur mon chemin » |
| 8 | Réserver | Demande, réponse en 3 min, relance |
| 9 | Suivi en direct | Carte et minutes avant l'arrivée |
| 10 | Arrivée et course | Sur place à 500 m, attente 15 min, démarrer, terminer |
| 11 | Après la course | Avis, badges |
| 12 | Notifications | Push FCM + historique MongoDB + préférences |
| 13 | Sécurité des usagers | SOS, signalements, blocages, lien de suivi pour un proche, messagerie |
| 14 | Back-office complet | Tableau de bord, modération, réglages |
| 15 | Mise en ligne | Tests de bout en bout, reprise des anciens comptes, serveur |

**Premier objectif** : le parcours le plus court qui marche de bout en bout
(étapes 0, 1, 5, 6, 7, 8, 9, 10). Le reste vient ensuite.

---

## Étape 0 — Socle

- [x] Corriger `CONTRIBUTING.md` (`apps/back` au lieu de `apps/api`), ajouter `apps/back/.env.example`
- [ ] Configuration validée au démarrage (`@nestjs/config`) : base, Mongo, JWT, Mapbox, FCM, SMS
  - [x] Base, Mongo, port, CORS
  - [x] JWT, SMS, stockage des fichiers (étape 1)
  - [ ] Mapbox (étape 5), FCM (étape 12)
- [x] Architecture DDD reprise de `ndaohody-back` : `domain` / `application` / `infrastructure` / `api`, filtre d'erreurs `{ status, message, timestamp }`, UnitOfWork, horloge
- [x] Migrations TypeORM à partir de `donnees.sql` + colonnes PostGIS (`geography`) et index GIST pour les positions et chemins
- [x] Données de démonstration = insertions de `donnees.sql` (`npm run db:seed`)
- [x] Swagger (`/api/docs`), validation des corps, helmet, CORS, limitation de débit
- [x] Préfixes : `/api/v1` (app) et `/api/admin` (back-office)
- [ ] `libs/shared/types` : reprendre `data-objets.ts`
- [x] CI : lint + tests + build (sans base de données : les tests remplacent les ports par des faux)

Pas de Docker en local : PostgreSQL et MongoDB tournent directement sur le PC.

**Fini quand** : `GET /api/health` répond `postgres: ok, mongodb: ok`.

---

## Étape 1 — Connexion par SMS

Routes en anglais, comme celles qu'appelle déjà l'app mobile, sous `/api/v1`.

- [x] `POST /auth/otp` : numéro normalisé `+261…`, code à 6 chiffres haché, valable 5 min (`parametre.otp_duree_minutes`), renvoi après 60 s, 5 codes max par jour (`code_otp`)
- [x] Port `SmsSender` + adaptateur (journal en local, vrai fournisseur ensuite ; `SMS_PROVIDER=log` refusé en production)
- [x] `POST /auth/otp/verify` : 3 essais max ; crée le compte s'il n'existe pas
- [x] Jeton d'accès JWT (15 min) + jeton de rafraîchissement (30 jours, haché dans la table `session_utilisateur`)
- [x] `POST /auth/refresh` (rotation : un jeton ne sert qu'une fois ; un jeton déjà utilisé ferme toutes les sessions), `POST /auth/logout`
- [x] Garde JWT sur toutes les routes de l'app (`@Authenticated()`)
- [x] Compte suspendu → connexion refusée avec message clair (aussi à l'envoi du code, et à chaque appel)
- [x] Limitation de débit **par compte** pour un utilisateur connecté (et non par adresse IP : à Madagascar, beaucoup de téléphones partagent la même IP chez l'opérateur) ; par IP **et** par numéro sur l'envoi / la vérification du code SMS, avec des limites strictes

**Fini quand** : un numéro reçoit un code, se connecte et appelle `GET /me`.

---

## Étape 2 — Profil et mode

- [x] `GET /me`, `PATCH /me` : nom, prénom, sexe obligatoires pour un nouveau compte ; le sexe ne change plus une fois choisi (trajets réservés aux femmes)
- [x] Photo de profil `PUT /me/photo` (JPEG, PNG ou WebP, 5 Mo max, recadrée en 512 × 512, stockage local derrière le port `FileStorage`)
- [x] `PATCH /me/mode` : passager ↔ chauffeur (publier exige un chauffeur validé)
- [x] `POST /me/devices`, `DELETE /me/devices` : jeton FCM du téléphone (MongoDB, collection `appareils`)
- [x] `DELETE /me` : suppression douce, refusée pendant une course (numéro libéré, sessions fermées)
- [x] Ancien compte incomplet → l'app reçoit `profilIncomplet: true`
- [ ] Refuser la réservation d'un profil incomplet (à faire à l'étape 8)

**Fini quand** : un nouvel utilisateur complète son profil et ne peut pas réserver tant qu'il est incomplet.

---

## Étape 3 — Back-office : comptes et rôles

Routes sous `/api/admin`.

- [x] Commande `npm run admin:create-super -- --email ... --name "..."` (le premier super admin ne passe pas par l'API ; mot de passe temporaire affiché une fois)
- [x] `POST /admin/auth/login` : e-mail + mot de passe (bcrypt), JWT séparé de celui de l'app (`JWT_ADMIN_SECRET`, 8 h), blocage 15 min après 5 échecs ; `GET /admin/auth/me`
- [x] Garde par action `@AdminAction(...)` (table des permissions par rôle) ; garde « lecture seule » : un investisseur ne peut appeler que des `GET`
- [x] super_admin seulement (`/admin/accounts`) : créer / désactiver un admin ou un investisseur, réinitialiser un mot de passe (mot de passe temporaire)
- [x] Journal automatique de toute action d'écriture (`journal_admin`, intercepteur + `@Audit(...)`)
- [x] Investisseur sans aucune donnée personnelle : il n'a accès qu'aux chiffres agrégés (tableau de bord, statistiques) et aux réglages

**Fini quand** : un investisseur reçoit 403 sur toute écriture.

### Actions du back-office par rôle (pour le front)

Le front affiche les menus et les boutons selon cette liste. ✅ = route déjà en place ; ⏳ = prévue (étape indiquée).
L'investisseur ne voit **que des chiffres agrégés** : jamais de liste de personnes, de téléphone, de plaque ni de document.

| Action | Route | super_admin | admin | investisseur | État |
|---|---|:-:|:-:|:-:|:-:|
| **Compte** | | | | | |
| Se connecter | `POST /admin/auth/login` | ✔ | ✔ | ✔ | ✅ |
| Voir son compte | `GET /admin/auth/me` | ✔ | ✔ | ✔ | ✅ |
| Changer son mot de passe | `PATCH /admin/auth/password` | ✔ | ✔ | ✔ | ⏳ 14 |
| **Comptes du back-office** | | | | | |
| Lister les comptes | `GET /admin/accounts` | ✔ | ✘ | ✘ | ✅ |
| Créer un admin / investisseur | `POST /admin/accounts` | ✔ | ✘ | ✘ | ✅ |
| Désactiver / réactiver un compte | `PATCH /admin/accounts/:id/active` | ✔ | ✘ | ✘ | ✅ |
| Réinitialiser un mot de passe | `POST /admin/accounts/:id/reset-password` | ✔ | ✘ | ✘ | ✅ |
| Voir le journal des actions | `GET /admin/journal` | ✔ | ✘ | ✘ | ⏳ 14 |
| **Chauffeurs et véhicules** | | | | | |
| Voir les dossiers en attente | `GET /admin/drivers/applications` | ✔ | ✔ | ✘ | ✅ |
| Valider / refuser un dossier | `POST /admin/drivers/:id/approve` · `/reject` | ✔ | ✔ | ✘ | ✅ |
| Voir les véhicules en attente | `GET /admin/vehicles/pending` | ✔ | ✔ | ✘ | ✅ |
| Valider / refuser un véhicule | `POST /admin/vehicles/:id/approve` · `/reject` | ✔ | ✔ | ✘ | ✅ |
| Liste et fiche des chauffeurs | `GET /admin/drivers` · `/:id` | ✔ | ✔ | ✘ | ⏳ 14 |
| Retirer la vérification, suspendre / réactiver comme chauffeur | `POST /admin/drivers/:id/...` | ✔ | ✔ | ✘ | ⏳ 14 |
| **Utilisateurs et activité** | | | | | |
| Liste et fiche des passagers | `GET /admin/users` · `/:id` | ✔ | ✔ | ✘ | ⏳ 14 |
| Suspendre / réactiver un compte | `POST /admin/users/:id/suspend` · `/reactivate` | ✔ | ✔ | ✘ | ⏳ 14 |
| Recherche globale | `GET /admin/search` | ✔ | ✔ | ✘ | ⏳ 14 |
| Trajets et réservations : listes, détail | `GET /admin/trips` · `/bookings` | ✔ | ✔ | ✘ | ⏳ 14 |
| Annuler un trajet ou une réservation | `POST /admin/trips/:id/cancel` · ... | ✔ | ✔ | ✘ | ⏳ 14 |
| Signalements et SOS : voir, traiter | `GET/POST /admin/reports` · `/sos` | ✔ | ✔ | ✘ | ⏳ 14 |
| **Suivi et statistiques** | | | | | |
| Tableau de bord (chiffres du jour) | `GET /admin/dashboard` | ✔ | ✔ | ✔ | ⏳ 14 |
| Statistiques sur une période | `GET /admin/stats/overview` | ✔ | ✔ | ✔ | ⏳ 14 |
| Courbes (par jour / semaine / mois) | `GET /admin/stats/timeseries` | ✔ | ✔ | ✔ | ⏳ 14 |
| Top des trajets quartier → quartier | `GET /admin/stats/top-routes` | ✔ | ✔ | ✔ | ⏳ 14 |
| Export CSV des statistiques | `GET /admin/stats/export.csv` | ✔ | ✔ | ✔ | ⏳ 14 |
| **Réglages** | | | | | |
| Voir les réglages et les tarifs | `GET /admin/settings` · `/tariffs` | ✔ | ✔ | ✔ | ⏳ 14 |
| Modifier les réglages et les tarifs | `PATCH /admin/settings` · `/tariffs` | ✔ | ✘ | ✘ | ⏳ 14 |

Le back renvoie la liste des actions permises au compte connecté (`permissions` dans `login` et `auth/me`, ✅) :
le front s'en sert pour afficher ou masquer, sans recopier ce tableau dans son code.
Types des objets échangés avec le back-office : [data-objets-back-office.ts](data-objets-back-office.ts) (`ActionAdmin`, `ConnexionAdmin`, `DossierChauffeur`…).
Côté back, la table des permissions est dans `apps/back/src/domain/entity/adminPermissions.ts` et chaque route déclare son action avec `@AdminAction(...)`.

---

## Étape 4 — Devenir chauffeur

- [x] Stockage privé des fichiers (`PRIVATE_UPLOADS_DIR`), liens signés valables 10 min (`GET /api/files`)
- [x] `GET/POST /me/documents` : permis recto (avec son numéro, envoyé en premier), verso, selfie → `statut_chauffeur = en_attente`
- [x] `GET/POST/PATCH/DELETE /me/vehicles` : plusieurs véhicules, plaque unique, moto = 1 place, photo, véhicule par défaut ; supprimer = archiver (la plaque reste liée au compte)
- [x] **Plusieurs véhicules par chauffeur** (ex. 2 voitures et 1 moto) : il en ajoute autant qu'il veut, à l'inscription (bouton « Ajouter un autre véhicule ») ou plus tard depuis son profil ; chacun est validé par un admin (`DemandeAjoutVehicule` dans `data-objets.ts`)
- [x] **Anti-fraude** : numéro de permis et plaque uniques sur **tous** les comptes, supprimés compris. Un chauffeur qui supprime son compte puis se réinscrit (même avec une nouvelle puce) avec le même permis ou la même plaque retrouve **son ancien compte** (historique, avis, et plus tard ce qu'il doit), à revérifier par un admin ; le compte tout juste créé est fermé. Permis ou plaque d'un autre compte encore utilisé → refusé
- [x] Back-office : file des dossiers, valider / refuser avec motif (`/admin/drivers`, `/admin/vehicles`)
- [x] Notification au chauffeur (validé / refusé) : historique MongoDB (`notifications`) ; le push FCM vient à l'étape 12
- [ ] L'admin compare le numéro de permis saisi avec la photo avant de valider (à rappeler dans l'écran du back-office)

**Fini quand** : un chauffeur validé avec un véhicule validé peut publier.

---

## Étape 5 — Cartes (Mapbox)

- [x] Port `RouteProvider` + adaptateur Mapbox Directions : chemin le plus court, distance, durée (cache 10 min des itinéraires déjà demandés)
- [x] `EtaService` : minutes entre le chauffeur et un point (réponse gardée 30 s ; ensuite nouvel appel seulement si le chauffeur a bougé de 100 m ou plus, ou toutes les 5 min)
- [x] Points ramenés sur la route la plus proche : chaque itinéraire renvoie ses points sur la route (`pointsSurRoute`, les « waypoints » de Mapbox)
- [x] `GET /geo/places`, `GET /geo/places/:id` (recherche de lieux), `GET /geo/area` (nom du quartier d'un point), `GET /geo/route` (aperçu d'itinéraire) ; clé Mapbox jamais envoyée au téléphone ; points hors de Madagascar refusés
- [x] Erreur propre (503) si Mapbox ne répond pas (délai 8 s, quota, token refusé) ; nombre d'appels du jour par service dans les logs
- [ ] App mobile : remplacer les appels directs à Mapbox (`placesService.ts`) par `/api/v1/geo/...` ; son token ne sert plus qu'à afficher la carte

**Fini quand** : Andoharanofotsy → Analakely renvoie un chemin, une distance et une durée réalistes.

---

## Étape 6 — Publier un trajet

Routes en anglais, comme celles que l'app mobile appelle déjà (`/api/v1/trips`, `/api/v1/me/trips`).

- [x] `POST /trips` : départ (position actuelle ou point choisi), destination, véhicule, places, **maintenant** (`immediat`) ou **date + heure** (`a_l_avance`) ; pas de prix : il est calculé pour chaque passager, voir étape 8
- [x] Le serveur demande le chemin à Mapbox et l'enregistre (l'app n'envoie jamais le chemin ni la distance) ; départ et arrivée ramenés sur la route ; l'app envoie `DemandePublicationTrajet` (`data-objets.ts`)
- [x] **Choix du véhicule** : un seul véhicule validé → il est pris tout seul, aucun choix proposé ; plusieurs → l'app fait choisir et envoie `vehiculeId` (sans lui : 400 avec la liste des véhicules dans `details.vehicules`) ; aucun → 403
- [x] Règles : chauffeur et véhicule validés, places ≤ places du véhicule, un seul trajet en route à la fois, pas deux trajets prévus qui se chevauchent (pas de doublon), départ entre 15 min et **15 jours** à l'avance (réglage `trajet_max_jours_avance`)
- [x] Option **« Réservé aux femmes »** (`reserveFemmes`) : possible seulement pour une conductrice (sexe `femme`) ; refusée pour un homme
- [x] Cette option est **un choix, jamais une obligation** : une conductrice publie des trajets normaux quand elle veut, et y accepte hommes et femmes
- [x] Trajet à l'avance : `POST /trips/:id/start` (« Je pars », dès 30 min avant l'heure), rappels 1 h et 10 min avant (chauffeur et passagers acceptés), annulation automatique 30 min après l'heure s'il n'est pas parti (passagers prévenus)
- [x] `PATCH /trips/:id` (heure ou places, avant le départ, passagers prévenus), `POST /trips/:id/cancel` (refusé si des passagers sont à bord), `GET /trips/:id`, `GET /me/trips`, `GET /me/trips/active`
- [ ] App mobile : ne plus envoyer `chemin`, `distanceMetres` ni `dureeSecondes` à `POST /trips` (le back les calcule et refuse les champs inconnus)

**Fini quand** : un trajet immédiat et un trajet à l'avance s'affichent avec leur chemin.

---

## Étape 7 — Rechercher : « le chauffeur passe sur mon chemin »

```
A ●━━━━━━━━━● B ━━━━━━━━━● C ━━━━━━━━━● D   chemin du chauffeur
            départ        destination
            du passager   du passager
```

- [x] `POST /trips/search` (`DemandeRecherche`) : départ, destination, places, `"maintenant"` ou une date
- [x] Points du passager ramenés sur la route du chauffeur ; marge GPS de 30 m seulement (réglage `marge_route_metres`), calculée par PostGIS
- [x] Départ **et** destination du passager sur le chemin du chauffeur, départ **avant** destination
- [x] Trajet parti : chauffeur en ligne et pas encore passé au point du passager
- [x] Trajet à l'avance : heure de passage estimée au point du passager entre 15 min avant et 60 min après l'heure demandée
- [x] Places libres ≥ places demandées ; ni le passager lui-même, ni un utilisateur bloqué (dans les deux sens), ni un trajet où il a déjà une demande en cours
- [x] Trajets **réservés aux femmes** : visibles seulement par les femmes
- [x] **Une femme a accès à tout**, passagère comme conductrice : elle voit et rejoint tous les trajets normaux (homme ou femme au volant, avec des passagers hommes), elle publie des trajets normaux, et elle peut en plus utiliser les trajets réservés aux femmes. C'est son choix, aucune restriction pour elle
- [x] Filtre facultatif `femmesSeulement` : une passagère qui le souhaite n'affiche que les trajets réservés aux femmes (désactivé par défaut ; ignoré pour un homme)
- [x] Réserver un trajet réservé aux femmes quand on est un homme → refusé (même en appelant l'API directement)
- [x] Tri : chauffeurs notés (meilleure note d'abord), puis non notés ; à égalité, le plus proche dans le temps
- [x] Réponse = `ResultatRecherche` (sans téléphone), avec la distance du passager, le prix d'une place et le prix total pour les places demandées (20 résultats au plus)

**Fini quand** : avec les données de démo, Tanjombato → Analakely trouve le trajet 1 et pas le trajet 5 (sens inverse).

---

## Étape 8 — Réserver

- [x] `POST /reservations` : trajet, places, prise en charge, dépose ; statut `en_attente`, expiration = maintenant + 3 min (réglage `delai_reponse_secondes`)
- [x] **Places** : de 1 à toutes les places libres du trajet (ex. 3 places libres → le passager peut réserver les 3 pour lui et ses proches) ; refusé au-delà
- [x] **Profil complet** (nom, prénom, sexe) obligatoire pour réserver (reste de l'étape 2)
- [x] **Prix calculé par le serveur** (jamais par l'app), puis figé sur la réservation :
  - distance du passager = longueur de la route du chauffeur entre la prise en charge et la dépose (PostGIS)
  - prix d'une place = max(prix minimum, km × prix au km), arrondi à la centaine supérieure, selon le type de véhicule (table `tarif`)

    | Véhicule | Prix au km | Prix minimum | Exemple |
    |---|---|---|---|
    | Voiture | 300 Ar | 3 000 Ar | 12 km → 3 600 Ar |
    | Moto | 500 Ar | 5 000 Ar | 13 km → 6 500 Ar |

  - prix total = prix d'une place × places (ex. 3 places en voiture sur 12 km → 10 800 Ar)
- [x] Chauffeur prévenu (historique des notifications MongoDB)
- [x] Chauffeur prévenu en direct par WebSocket (`booking-requested`, étape 9)
- [ ] Chauffeur prévenu par push FCM quand l'app est fermée (étape 12)
- [x] `POST /reservations/:id/accept` : places retirées en une seule opération (jamais deux fois la même place) ; la discussion s'ouvre
- [x] `POST /reservations/:id/refuse` avec un motif ; notification au passager ; `GET /reservations/:id/refusal-reason`
- [x] Tâche toutes les 15 s : sans réponse en 3 min → `expiree`, passager prévenu, demande retirée de l'écran du chauffeur (`GET /me/requests`)
- [x] Accepter une demande expirée → refusé
- [x] `POST /reservations/:id/retry` : nouvelle demande au même chauffeur (2 fois max, réglage `relances_max`)
- [x] « Chercher un autre chauffeur » : l'app relance `POST /trips/search` avec les mêmes critères
- [x] `POST /reservations/:id/cancel` : le **passager** annule seulement **avant la réponse** du chauffeur (règle de l'app) ; le **chauffeur** peut annuler un passager jusqu'à sa montée (places rendues) ; l'autre est prévenu
- [x] `GET /reservations/:id` (passager ou chauffeur du trajet), `GET /me/reservations`, `GET /me/requests`

**Fini quand** : deux acceptations sur la dernière place → une seule réussit ; une demande ignorée expire à 3 min.

---

## Étape 9 — Suivi en direct

- [x] Passerelle WebSocket (Socket.IO, namespace `/live`) protégée par le JWT de l'app ; chaque connexion rejoint seulement la salle de **son compte** (`user:<id>`) : on ne reçoit que ce qui concerne ses trajets et réservations
- [x] Le chauffeur envoie sa position toutes les 5 s (événement `driver-position`, ou `POST /me/position`) → `position_chauffeur`
- [x] Après acceptation, le passager reçoit `tracking-update` (`MiseAJourSuivi`) : position du chauffeur, chemin jusqu'à lui, minutes avant l'arrivée (Mapbox via `EtaService`, sinon estimées avec la route si Mapbox ne répond pas)
- [x] Le chauffeur reçoit la position du passager (`passenger-position`, jamais enregistrée) et le même `tracking-update` avec le chemin jusqu'à lui
- [x] GPS obligatoire : chauffeur sans position depuis 2 min → événement `location-required` « Active ta localisation »
- [x] Chauffeur hors ligne après 2 min sans position (tâche toutes les 30 s) : il disparaît des recherches
- [x] Secours sans WebSocket : `GET /reservations/:id/tracking` (`SuiviReservation`, téléphones visibles après acceptation)
- [x] Réservations en direct (reste de l'étape 8) : `booking-requested` au chauffeur, `booking-updated` (acceptée, refusée, expirée, annulée) au passager et au chauffeur
- [ ] App mobile : se connecter à `/live`, envoyer `driver-position` / `passenger-position`, écouter les événements (liste dans `data-objets.ts`)

**Fini quand** : le passager voit le chauffeur avancer et les minutes baisser.

---

## Étape 10 — Arrivée et course

- [ ] À moins de 500 m, l'app reçoit `peutSignalerSurPlace: true`
- [ ] `POST /reservations/:id/sur-place` : distance vérifiée par le serveur ; passager alerté ; compte à rebours de 15 min (`fin_attente`)
- [ ] Tâche : fin des 15 min → le chauffeur choisit
  - [ ] `POST /reservations/:id/prolonger` : nouveau compte à rebours de 15 min
  - [ ] `POST /reservations/:id/absent` : places libérées, absence comptée
- [ ] `POST /reservations/:id/demarrer` : passager à bord, trajet `en_cours`
- [ ] `POST /reservations/:id/terminer` : course de **ce** passager terminée ; notification « Votre course est terminée, notez votre chauffeur »
- [ ] Trajet terminé quand toutes les courses sont fermées (fin automatique de secours)

**Fini quand** : le parcours complet passe : publier → rechercher → réserver → accepter → sur place → démarrer → terminer.

---

## Étape 11 — Après la course : avis et badges

- [ ] `POST /reservations/:id/avis` : 1 à 5 + commentaire, dans les deux sens, une seule fois
- [ ] Note moyenne recalculée
- [ ] Rappel si pas d'avis après 1 h
- [ ] Badges calculés par le serveur :

| Badge | Passager | Chauffeur |
|---|---|---|
| nouveau | moins de 3 courses | moins de 5 courses |
| non_verifie | profil incomplet | dossier non validé |
| verifie | profil complet, au moins 3 courses | dossier et véhicule validés, au moins 5 courses |
| top | note ≥ 4,7 sur 20 courses | note ≥ 4,7 sur 30 courses, pas de signalement validé |

- [ ] Recalcul après chaque course, avis, absence ou décision admin

---

## Étape 12 — Notifications

- [ ] Service unique : enregistre dans MongoDB puis envoie en FCM ; supprime les jetons invalides
- [ ] Une panne de MongoDB ou de FCM n'annule jamais l'action (la réservation reste valable)
- [ ] Renvoi automatique des envois en échec (3 essais)
- [ ] `GET /notifications`, `PATCH /notifications/:id/lu`, `PATCH /notifications/tout-lu`
- [ ] Types : voir `TypeNotification` dans [data-objets.ts](data-objets.ts)
- [ ] **Préférences de notifications** : `GET /moi/preferences-notifications`, `PATCH /moi/preferences-notifications` (table `preference_notification`)
  - [ ] Se coupent : rappels de départ, nouveaux messages, demandes d'avis, badges, trajet modifié
  - [ ] Ne se coupent jamais : nouvelle demande, acceptation / refus / expiration, chauffeur sur place, annulation, SOS
  - [ ] Une notification coupée n'est ni enregistrée ni envoyée en push

---

## Étape 13 — Sécurité des usagers

- [ ] `POST /sos` avec position → alerte immédiate au back-office
- [ ] `POST /signalements` (motifs : comportement, sécurité, arnaque, absent, véhicule différent, autre)
- [ ] `POST /blocages`, `DELETE /blocages/:id` : les deux ne se voient plus
- [ ] **Lien de suivi pour un proche** (table `lien_suivi`)
  - [ ] `POST /reservations/:id/lien-suivi` : crée (ou renvoie) un lien `/suivi/<jeton>` (jeton aléatoire de 40 caractères) à partager par WhatsApp / SMS
  - [ ] `GET /suivi/:jeton` (public, sans compte) → `SuiviPublic` : état, prénoms, véhicule, plaque, chemin, position du chauffeur pendant l'approche et la course
  - [ ] Jamais de numéro de téléphone ; page non indexée ; 30 consultations / min par adresse IP
  - [ ] Le lien expire 24 h après la fin (ou l'annulation) de la course
- [ ] Messagerie par réservation (texte + vocal) en WebSocket, messages effacés après 24 h

---

## Étape 14 — Back-office complet

- [ ] Tableau de bord (`TableauDeBord`) et carte des chauffeurs en ligne
- [ ] Graphique des courses sur les 30 derniers jours
- [ ] Recherche globale : nom, téléphone, plaque, numéro de trajet ou de réservation
- [ ] Chauffeurs : liste filtrable (en attente, validés, refusés, suspendus) ; fiche avec documents, véhicules, note, trajets, signalements reçus, nombre de personnes qui l'ont bloqué
- [ ] Chauffeur : retirer la vérification, suspendre / réactiver **comme chauffeur** (il reste passager) avec motif
- [ ] Passagers : liste ; fiche avec note donnée par les chauffeurs, courses, annulations, absences, signalements reçus, nombre de personnes qui l'ont bloqué
- [ ] Suspendre / réactiver un compte avec motif : les trajets et réservations en cours sont annulés et les personnes concernées prévenues
- [ ] Trajets et réservations : listes, détail, annulation par un admin
- [ ] Signalements et SOS : traitement avec note
- [ ] Admins prévenus d'un nouveau dossier chauffeur, d'un signalement et d'un SOS
- [ ] Réglages (`parametre`) et tarifs (`tarif` : prix minimum et prix au km de la voiture et de la moto) : lecture pour tous, modification super_admin ; un nouveau tarif ne change pas le prix des réservations déjà faites
- [ ] Export CSV des statistiques pour l'investisseur (sans données personnelles)
- [ ] **Espace investisseur : statistiques agrégées, en lecture seule** (`/admin/stats/...`, ouvert aussi au super_admin et à l'admin)
  - [ ] Croissance : inscrits (total, nouveaux par jour / semaine / mois), chauffeurs validés, dossiers en attente, utilisateurs actifs (jour, semaine, mois)
  - [ ] Activité : courses terminées par jour (courbe 30 / 90 jours), places réservées, taux de remplissage, trajets à l'avance / immédiats, voiture / moto
  - [ ] Argent : montant total payé aux chauffeurs (Ar), prix moyen d'une course, distance moyenne ; plus tard, revenus de la commission
  - [ ] Qualité : taux d'acceptation, temps moyen de réponse du chauffeur, taux d'annulation et d'absence, notes moyennes
  - [ ] Sécurité : nombre de signalements et de SOS, délai moyen de traitement
  - [ ] Géographie : top 10 des trajets quartier → quartier, carte de chaleur par quartier
  - [ ] Filtre par période et comparaison avec la période précédente (ex. « +12 % »)
  - [ ] Jamais de donnée personnelle ; un groupe de moins de 5 personnes est masqué ou regroupé dans « Autres »
  - [x] L'investisseur n'a plus accès aux listes opérationnelles (dossiers, véhicules ; trajets et signalements le seront de même)
  - [ ] Chiffres précalculés chaque nuit (table de statistiques quotidiennes) pour rester rapides
- [ ] Consulter le journal des actions (`GET /admin/journal`, super_admin)
- [ ] Changer son mot de passe (`PATCH /admin/auth/password`, tous les rôles) ; obliger à changer le mot de passe temporaire à la 1re connexion
- [x] `permissions` (liste des actions permises) renvoyée par `login` et `auth/me`, pour que le front affiche ou masque menus et boutons

---

## Étape 15 — Mise en ligne

- [ ] Test de bout en bout du parcours complet (Mapbox simulé)
- [ ] Reprise des anciens comptes de la PWA (numéros `+261…`, anciens chauffeurs à revérifier), testée sur une copie
- [ ] Serveur (Docker) : API, PostgreSQL + PostGIS, MongoDB, HTTPS, WebSocket, sauvegardes quotidiennes
- [ ] Surveillance : erreurs, consommation Mapbox / SMS / FCM
- [ ] Mapbox : compte au nom du projet, token séparé pour le back (`MAPBOX_ACCESS_TOKEN`, jamais dans l'app), token du mobile limité à l'affichage de la carte ; alerte de dépassement de quota activée

---

## Réglages utilisés par le back (table `parametre`)

| Clé | Valeur | Rôle |
|---|---|---|
| `delai_reponse_secondes` | 180 | Le chauffeur a 3 min pour répondre |
| `relances_max` | 2 | Relances au même chauffeur |
| `rayon_sur_place_metres` | 500 | Bouton « Je suis déjà sur place » |
| `attente_minutes` | 15 | Compte à rebours |
| `marge_route_metres` | 30 | Marge GPS « sur la route » |
| `frequence_position_secondes` | 5 | Envoi de la position du chauffeur |
| `otp_duree_minutes` | 5 | Validité du code SMS |

Les prix sont dans la table `tarif` (une ligne par type de véhicule : prix minimum, prix au km, arrondi), modifiable par le super admin.

Détail de chaque tâche : `D:\ismael\Ndaohody\Taches-back-Ndaohody-v2.docx`.
