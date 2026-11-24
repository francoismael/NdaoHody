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

- [ ] Corriger `CONTRIBUTING.md` (`apps/back` au lieu de `apps/api`), ajouter `apps/back/.env.example`
- [ ] `docker-compose.yml` : PostgreSQL 16 + PostGIS, MongoDB 7
- [ ] Configuration validée au démarrage (`@nestjs/config`) : base, Mongo, JWT, Mapbox, FCM, SMS
- [ ] Architecture DDD reprise de `ndaohody-back` : `domain` / `application` / `infrastructure` / `api`, filtre d'erreurs `{ status, message, timestamp }`, UnitOfWork, horloge
- [ ] Migrations TypeORM à partir de `donnees.sql` + colonnes PostGIS (`geography`) et index GIST pour les positions et chemins
- [ ] Données de démonstration = insertions de `donnees.sql`
- [ ] Swagger (`/api/docs`), validation des corps, helmet, CORS, limitation de débit
- [ ] Préfixes : `/api/v1` (app) et `/api/admin` (back-office)
- [ ] `libs/shared/types` : reprendre `data-objets.ts`
- [ ] CI : lint + tests + build avec PostgreSQL et MongoDB

**Fini quand** : `GET /api/sante` répond `postgres: ok, mongodb: ok`.

---

## Étape 1 — Connexion par SMS

- [ ] `POST /auth/otp/envoyer` : numéro normalisé `+261…`, code à 6 chiffres haché, valable 5 min, renvoi après 60 s, 5 codes max par jour (`code_otp`)
- [ ] Port `SmsSender` + adaptateur (journal en local, vrai fournisseur ensuite)
- [ ] `POST /auth/otp/verifier` : 3 essais max ; crée le compte s'il n'existe pas
- [ ] Jeton d'accès JWT (15 min) + jeton de rafraîchissement (30 jours)
- [ ] `POST /auth/rafraichir`, `POST /auth/deconnexion`
- [ ] Garde JWT sur toutes les routes de l'app
- [ ] Compte suspendu → connexion refusée avec message clair
- [ ] Limitation de débit **par compte** pour un utilisateur connecté (et non par adresse IP : à Madagascar, beaucoup de téléphones partagent la même IP chez l'opérateur) ; par IP **et** par numéro sur l'envoi / la vérification du code SMS, avec des limites strictes

**Fini quand** : un numéro reçoit un code, se connecte et appelle `GET /moi`.

---

## Étape 2 — Profil et mode

- [ ] `GET /moi`, `PATCH /moi` : nom, prénom, sexe obligatoires pour un nouveau compte
- [ ] Photo de profil (envoi, redimensionnement, stockage)
- [ ] `PATCH /moi/mode` : passager ↔ chauffeur (publier exige un chauffeur validé)
- [ ] `POST /appareils`, `DELETE /appareils` : jeton FCM du téléphone (MongoDB)
- [ ] `DELETE /moi` : suppression douce, refusée pendant une course
- [ ] Ancien compte incomplet → l'app reçoit `profilIncomplet: true`

**Fini quand** : un nouvel utilisateur complète son profil et ne peut pas réserver tant qu'il est incomplet.

---

## Étape 3 — Back-office : comptes et rôles

- [ ] Commande `create-super-admin` (le premier super admin ne passe pas par l'API)
- [ ] `POST /admin/auth/connexion` : e-mail + mot de passe, JWT séparé de celui de l'app, blocage après 5 échecs
- [ ] Garde de rôles `@Roles(...)` ; garde « lecture seule » : un investisseur ne peut appeler que des `GET`
- [ ] super_admin seulement : créer / désactiver un admin ou un investisseur, réinitialiser un mot de passe
- [ ] Journal automatique de toute action d'écriture (`journal_admin`)
- [ ] Réponses pour investisseur sans données personnelles (téléphones, documents, messages)

| Droit | super_admin | admin | investisseur |
|---|:-:|:-:|:-:|
| Voir tableaux de bord et listes | ✔ | ✔ | ✔ (anonymisé) |
| Valider chauffeurs, modérer, annuler | ✔ | ✔ | ✘ |
| Modifier les réglages | ✔ | ✘ | ✘ |
| Créer des comptes admin / investisseur | ✔ | ✘ | ✘ |

**Fini quand** : un investisseur reçoit 403 sur toute écriture.

---

## Étape 4 — Devenir chauffeur

- [ ] Stockage privé des fichiers, liens à durée limitée
- [ ] `POST /chauffeur/documents` : permis recto, verso, selfie → `statut_chauffeur = en_attente`
- [ ] `GET/POST/PATCH/DELETE /chauffeur/vehicules` : plusieurs véhicules, plaque unique, moto = 1 place, photo, véhicule par défaut
- [ ] Back-office : file des dossiers, valider / refuser avec motif (documents et véhicules)
- [ ] Notification au chauffeur (validé / refusé)

**Fini quand** : un chauffeur validé avec un véhicule validé peut publier.

---

## Étape 5 — Cartes (Mapbox)

- [ ] Port `RouteProvider` + adaptateur Mapbox Directions : chemin le plus court, distance, durée
- [ ] Port `EtaProvider` : minutes entre le chauffeur et un point (cache 30 s, appel seulement si le chauffeur a bougé de plus de 100 m)
- [ ] `RoadSnapper` : ramener un point choisi par le passager sur la route la plus proche
- [ ] `GET /geo/recherche`, `GET /geo/adresse` : noms des lieux (clé Mapbox jamais envoyée au téléphone)
- [ ] Erreur propre (503) si Mapbox ne répond pas ; suivi du quota

**Fini quand** : Andoharanofotsy → Analakely renvoie un chemin, une distance et une durée réalistes.

---

## Étape 6 — Publier un trajet

- [ ] `POST /trajets` : départ (position actuelle ou point choisi), destination, véhicule, places, prix, **maintenant** ou **date + heure**
- [ ] Le serveur demande le chemin à Mapbox et l'enregistre
- [ ] Règles : chauffeur et véhicule validés, places ≤ places du véhicule, prix ≤ palier, un seul trajet parti à la fois, pas de doublon, 60 jours max à l'avance
- [ ] Option **« Réservé aux femmes »** (`reserve_femmes`) : possible seulement pour une conductrice (sexe `femme`) ; refusée pour un homme
- [ ] Cette option est **un choix, jamais une obligation** : une conductrice publie des trajets normaux quand elle veut, et y accepte hommes et femmes
- [ ] Prix suggéré selon `palier_prix`
- [ ] Trajet à l'avance : `POST /trajets/:id/partir` (« Je pars »), rappels 1 h et 10 min avant, annulation automatique s'il ne part pas
- [ ] `PATCH /trajets/:id` (avant le départ, passagers prévenus), `POST /trajets/:id/annuler`, `GET /trajets/actif`

**Fini quand** : un trajet immédiat et un trajet à l'avance s'affichent avec leur chemin.

---

## Étape 7 — Rechercher : « le chauffeur passe sur mon chemin »

```
A ●━━━━━━━━━● B ━━━━━━━━━● C ━━━━━━━━━● D   chemin du chauffeur
            départ        destination
            du passager   du passager
```

- [ ] `POST /recherche` : départ, destination, places, maintenant ou plus tard
- [ ] Points du passager ramenés sur la route ; marge GPS de 30 m seulement
- [ ] Départ **et** destination du passager sur le chemin du chauffeur, départ **avant** destination
- [ ] Trajet parti : chauffeur en ligne et pas encore passé au point du passager
- [ ] Trajet à l'avance : heure de passage estimée dans la plage demandée
- [ ] Places libres ≥ places demandées ; ni le passager lui-même, ni un utilisateur bloqué
- [ ] Trajets **réservés aux femmes** : visibles seulement par les femmes
- [ ] **Une femme a accès à tout**, passagère comme conductrice : elle voit et rejoint tous les trajets normaux (homme ou femme au volant, avec des passagers hommes), elle publie des trajets normaux, et elle peut en plus utiliser les trajets réservés aux femmes. C'est son choix, aucune restriction pour elle
- [ ] Filtre facultatif `femmesSeulement` : une passagère qui le souhaite n'affiche que les trajets réservés aux femmes (désactivé par défaut)
- [ ] Réserver un trajet réservé aux femmes quand on est un homme → refusé (même en appelant l'API directement)
- [ ] Tri : chauffeurs notés (meilleure note d'abord), puis non notés ; à égalité, le plus proche
- [ ] Réponse = `ResultatRecherche` (sans téléphone)

**Fini quand** : avec les données de démo, Tanjombato → Analakely trouve le trajet 1 et pas le trajet 5 (sens inverse).

---

## Étape 8 — Réserver

- [ ] `POST /trajets/:id/reserver` : places, prise en charge, dépose, prix copié ; statut `en_attente`, expiration = maintenant + 3 min
- [ ] Chauffeur prévenu (push + WebSocket)
- [ ] `POST /reservations/:id/accepter` : places retirées en une seule opération (jamais deux fois la même place)
- [ ] `POST /reservations/:id/refuser` : notification au passager
- [ ] Tâche toutes les 15 s : sans réponse en 3 min → `expiree`, passager prévenu, demande retirée de l'écran du chauffeur
- [ ] Accepter une demande expirée → refusé
- [ ] `POST /reservations/:id/relancer` : nouvelle demande au même chauffeur (2 fois max)
- [ ] « Chercher un autre chauffeur » : relancer la recherche avec les mêmes critères
- [ ] `POST /reservations/:id/annuler` (passager ou chauffeur, avant la montée) : places rendues

**Fini quand** : deux acceptations sur la dernière place → une seule réussit ; une demande ignorée expire à 3 min.

---

## Étape 9 — Suivi en direct

- [ ] Passerelle WebSocket protégée par le JWT, une salle par trajet et par réservation
- [ ] Le chauffeur envoie sa position toutes les 5 s → `position_chauffeur`
- [ ] Après acceptation, le passager reçoit : position du chauffeur, chemin jusqu'à lui, minutes avant l'arrivée
- [ ] Le chauffeur reçoit la position du passager et le chemin jusqu'à lui
- [ ] GPS obligatoire : sans position récente → « Active ta localisation »
- [ ] Chauffeur hors ligne après 2 min sans position (disparaît des recherches)
- [ ] Secours sans WebSocket : `GET /reservations/:id/suivi` (`SuiviReservation`)

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
- [ ] Réglages (`parametre`) : lecture pour tous, modification super_admin
- [ ] Export CSV des statistiques pour l'investisseur (sans données personnelles)

---

## Étape 15 — Mise en ligne

- [ ] Test de bout en bout du parcours complet (Mapbox simulé)
- [ ] Reprise des anciens comptes de la PWA (numéros `+261…`, anciens chauffeurs à revérifier), testée sur une copie
- [ ] Serveur (Docker) : API, PostgreSQL + PostGIS, MongoDB, HTTPS, WebSocket, sauvegardes quotidiennes
- [ ] Surveillance : erreurs, consommation Mapbox / SMS / FCM

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
| `prix_max_par_place` | 10000 | Prix maximum (Ar) |
| `otp_duree_minutes` | 5 | Validité du code SMS |

Détail de chaque tâche : `D:\ismael\Ndaohody\Taches-back-Ndaohody-v2.docx`.
