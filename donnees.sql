/* =============================================================================
   NDAOHODY — Base de données et données fictives (pour simuler le front)
   PostgreSQL 15+.  Novembre 2026.

   Lancer :
     psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE ndaohody_mock"
     psql -U postgres -h 127.0.0.1 -d ndaohody_mock -f donnees.sql

   Conventions :
     - téléphones au format +261XXXXXXXXX ;
     - montants en Ariary (entiers) ;
     - dates avec fuseau (+03 = heure de Madagascar) ;
     - positions en latitude / longitude ;
     - chemin d'un trajet = liste de points [longitude, latitude] (format GeoJSON,
       directement utilisable par Mapbox).

   Les données simulent la situation du 24/11/2026 à 10h00 (heure de Madagascar).
   Mot de passe de tous les comptes du back-office : Ndaohody2026!
   Les notifications push sont dans MongoDB : elles ne sont pas ici.
   ============================================================================= */

DROP TABLE IF EXISTS preference_notification, lien_suivi, blocage, alerte_sos, signalement, avis, message, conversation,
    reservation, position_chauffeur, trajet, tarif, quartier, vehicule,
    document_chauffeur, session_utilisateur, code_otp, utilisateur, journal_admin, administrateur, parametre CASCADE;


/* =============================================================================
   1. STRUCTURE
   ============================================================================= */

/* réglages modifiables par le super admin ex: délai de réponse du chauffeur, rayon "sur place", ... */
CREATE TABLE parametre (
    cle VARCHAR(100) PRIMARY KEY,
    valeur VARCHAR(255) NOT NULL,
    description VARCHAR(255)
);


/* comptes du back-office : super_admin (accès total), admin, investisseur (lecture seule) */
CREATE TABLE administrateur (
    id SERIAL PRIMARY KEY,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    cree_par BIGINT,
    derniere_connexion TIMESTAMPTZ,
    echecs_connexion INT NOT NULL DEFAULT 0,   -- mots de passe faux d'affilée
    bloque_jusqua TIMESTAMPTZ,                -- bloqué 15 min après 5 échecs
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_administrateur_role
        CHECK (role IN ('super_admin', 'admin', 'investisseur')),

    CONSTRAINT fk_administrateur_createur
        FOREIGN KEY (cree_par)
        REFERENCES administrateur(id)
);


/* qui a fait quoi dans le back-office ex: validation d'un chauffeur, suspension, ... */
CREATE TABLE journal_admin (
    id SERIAL PRIMARY KEY,
    administrateur_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    cible_type VARCHAR(50),
    cible_id BIGINT,
    details TEXT,
    date_action TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_journal_administrateur
        FOREIGN KEY (administrateur_id)
        REFERENCES administrateur(id)
);


/* utilisateur de l'application : passager et, s'il est validé, chauffeur (bouton mode) */
CREATE TABLE utilisateur (
    id SERIAL PRIMARY KEY,
    telephone VARCHAR(20) NOT NULL UNIQUE,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    sexe VARCHAR(10),
    photo_url VARCHAR(255),
    mode_actuel VARCHAR(10) NOT NULL DEFAULT 'passager',
    statut_chauffeur VARCHAR(20) NOT NULL DEFAULT 'aucun',
    statut VARCHAR(20) NOT NULL DEFAULT 'actif',
    badge VARCHAR(20) NOT NULL DEFAULT 'nouveau',
    note_moyenne DECIMAL(2,1),
    nombre_notes INT NOT NULL DEFAULT 0,
    courses_passager INT NOT NULL DEFAULT 0,
    courses_chauffeur INT NOT NULL DEFAULT 0,
    absences INT NOT NULL DEFAULT 0,
    telephone_verifie BOOLEAN NOT NULL DEFAULT FALSE,
    numero_permis VARCHAR(30) UNIQUE,   -- unique sur tous les comptes, supprimés compris : retrouve l'ancien compte d'un chauffeur
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_utilisateur_sexe
        CHECK (sexe IN ('homme', 'femme')),

    CONSTRAINT ck_utilisateur_mode
        CHECK (mode_actuel IN ('passager', 'chauffeur')),

    CONSTRAINT ck_utilisateur_statut_chauffeur
        CHECK (statut_chauffeur IN ('aucun', 'en_attente', 'valide', 'refuse', 'suspendu')),

    CONSTRAINT ck_utilisateur_statut
        CHECK (statut IN ('actif', 'suspendu', 'supprime')),

    CONSTRAINT ck_utilisateur_badge
        CHECK (badge IN ('nouveau', 'non_verifie', 'verifie', 'top')),

    CONSTRAINT ck_utilisateur_note
        CHECK (note_moyenne BETWEEN 1 AND 5)
);


/* codes de connexion envoyés par WhatsApp ou par SMS (on garde le hash du code, jamais le code)
   whatsapp_message_id : identifiant du message chez Meta, pour retrouver le code quand Meta signale un échec
   date_annulation : code remplacé par un nouveau code SMS (il n'est plus accepté)
   date_echec_livraison : Meta n'a pas pu livrer le message WhatsApp */
CREATE TABLE code_otp (
    id SERIAL PRIMARY KEY,
    telephone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    essais INT NOT NULL DEFAULT 0,
    canal VARCHAR(10) NOT NULL DEFAULT 'sms',
    whatsapp_message_id VARCHAR(100),
    date_expiration TIMESTAMPTZ NOT NULL,
    date_utilisation TIMESTAMPTZ,
    date_annulation TIMESTAMPTZ,
    date_echec_livraison TIMESTAMPTZ,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_code_otp_canal
        CHECK (canal IN ('sms', 'whatsapp'))
);

/* un message WhatsApp ne correspond qu'à un seul code */
CREATE UNIQUE INDEX ux_code_otp_whatsapp_message_id ON code_otp (whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;


/* téléphones connectés : un jeton de rafraîchissement (30 jours) par session, on garde son hash.
   date_revocation : déconnexion, renouvellement du jeton, compte suspendu ou supprimé */
CREATE TABLE session_utilisateur (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    jeton_hash VARCHAR(64) NOT NULL UNIQUE,
    date_expiration TIMESTAMPTZ NOT NULL,
    date_revocation TIMESTAMPTZ,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_session_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id)
        ON DELETE CASCADE
);


/* documents envoyés par un chauffeur pour être vérifié : permis recto, verso, selfie */
CREATE TABLE document_chauffeur (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    fichier_url VARCHAR(255) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    motif_refus VARCHAR(255),
    verifie_par BIGINT,
    date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_document_type
        CHECK (type IN ('permis_recto', 'permis_verso', 'selfie')),

    CONSTRAINT ck_document_statut
        CHECK (statut IN ('en_attente', 'valide', 'refuse')),

    CONSTRAINT fk_document_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_document_administrateur
        FOREIGN KEY (verifie_par)
        REFERENCES administrateur(id)
);


/* véhicules d'un chauffeur (il peut en avoir plusieurs : moto et/ou voiture) */
CREATE TABLE vehicule (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    type VARCHAR(10) NOT NULL,
    marque VARCHAR(50),
    modele VARCHAR(50),
    couleur VARCHAR(30) NOT NULL,
    immatriculation VARCHAR(20) NOT NULL UNIQUE,
    places INT NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    par_defaut BOOLEAN NOT NULL DEFAULT FALSE,
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
    motif_refus VARCHAR(255),

    CONSTRAINT ck_vehicule_type
        CHECK (type IN ('moto', 'voiture')),

    CONSTRAINT ck_vehicule_places
        CHECK (places BETWEEN 1 AND 8 AND (type = 'voiture' OR places = 1)),

    CONSTRAINT ck_vehicule_statut
        CHECK (statut IN ('en_attente', 'valide', 'refuse', 'archive')),

    CONSTRAINT fk_vehicule_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id)
        ON DELETE CASCADE
);


/* quartiers d'Antananarivo ex: Analakely, Ivandry, ... (pour nommer et chercher les lieux) */
CREATE TABLE quartier (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL
);


/* tarif par type de véhicule, calculé sur la distance du PASSAGER (prise en charge -> dépose) :
   prix d'une place = max(prix_minimum, distance en km x prix_par_km), arrondi à la centaine supérieure
   ex: voiture 12 km -> 3 600 Ar ; moto 13 km -> 6 500 Ar ; prix total = prix d'une place x places */
CREATE TABLE tarif (
    type_vehicule VARCHAR(10) PRIMARY KEY,
    prix_minimum INT NOT NULL,
    prix_par_km INT NOT NULL,
    arrondi INT NOT NULL DEFAULT 100,

    CONSTRAINT ck_tarif_type
        CHECK (type_vehicule IN ('moto', 'voiture')),

    CONSTRAINT ck_tarif_montants
        CHECK (prix_minimum > 0 AND prix_par_km > 0 AND arrondi > 0)
);


/* trajet publié par un chauffeur : à l'avance (date choisie) ou immédiat (il part maintenant) */
CREATE TABLE trajet (
    id SERIAL PRIMARY KEY,
    chauffeur_id BIGINT NOT NULL,
    vehicule_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'publie',
    depart_libelle VARCHAR(150) NOT NULL,
    depart_latitude DECIMAL(10,7) NOT NULL,
    depart_longitude DECIMAL(10,7) NOT NULL,
    arrivee_libelle VARCHAR(150) NOT NULL,
    arrivee_latitude DECIMAL(10,7) NOT NULL,
    arrivee_longitude DECIMAL(10,7) NOT NULL,
    chemin JSONB NOT NULL,
    distance_metres INT NOT NULL,
    duree_secondes INT NOT NULL,
    date_depart TIMESTAMPTZ NOT NULL,
    places_total INT NOT NULL,
    places_libres INT NOT NULL,
    date_annulation TIMESTAMPTZ,
    date_fin TIMESTAMPTZ,
    /* TRUE : seules les femmes voient ce trajet (option choisie par une conductrice).
       Une femme, passagère ou conductrice, garde accès à tous les trajets normaux
       avec des hommes : c'est son choix, jamais une obligation. */
    reserve_femmes BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT ck_trajet_type
        CHECK (type IN ('a_l_avance', 'immediat')),

    CONSTRAINT ck_trajet_statut
        CHECK (statut IN ('publie', 'en_route', 'en_cours', 'termine', 'annule')),

    CONSTRAINT ck_trajet_places
        CHECK (places_libres BETWEEN 0 AND places_total),

    CONSTRAINT fk_trajet_chauffeur
        FOREIGN KEY (chauffeur_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_trajet_vehicule
        FOREIGN KEY (vehicule_id)
        REFERENCES vehicule(id)
);


/* dernière position connue de chaque chauffeur (mise à jour toutes les 5 secondes) */
CREATE TABLE position_chauffeur (
    chauffeur_id BIGINT PRIMARY KEY,
    trajet_id BIGINT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    en_ligne BOOLEAN NOT NULL DEFAULT TRUE,
    date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_position_chauffeur
        FOREIGN KEY (chauffeur_id)
        REFERENCES utilisateur(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_position_trajet
        FOREIGN KEY (trajet_id)
        REFERENCES trajet(id)
);


/* demande d'un passager sur un trajet : le chauffeur a 3 minutes pour accepter ou refuser */
CREATE TABLE reservation (
    id SERIAL PRIMARY KEY,
    trajet_id BIGINT NOT NULL,
    passager_id BIGINT NOT NULL,
    /* le passager réserve de 1 place à toutes les places libres du trajet */
    places INT NOT NULL DEFAULT 1,
    /* distance du passager sur la route du chauffeur (prise en charge -> dépose) */
    distance_metres INT NOT NULL,
    /* calculé avec la table tarif au moment de la demande, puis figé */
    prix_par_place INT NOT NULL,
    prix_total INT NOT NULL,
    prise_en_charge_libelle VARCHAR(150) NOT NULL,
    prise_en_charge_latitude DECIMAL(10,7) NOT NULL,
    prise_en_charge_longitude DECIMAL(10,7) NOT NULL,
    depose_libelle VARCHAR(150) NOT NULL,
    depose_latitude DECIMAL(10,7) NOT NULL,
    depose_longitude DECIMAL(10,7) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    relance_de BIGINT,
    motif_refus VARCHAR(255),   -- raison du refus donnée par le chauffeur, montrée au passager
    date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration TIMESTAMPTZ NOT NULL,
    date_reponse TIMESTAMPTZ,
    date_sur_place TIMESTAMPTZ,
    fin_attente TIMESTAMPTZ,
    prolongations INT NOT NULL DEFAULT 0,
    date_debut_course TIMESTAMPTZ,
    date_fin_course TIMESTAMPTZ,
    date_annulation TIMESTAMPTZ,

    CONSTRAINT ck_reservation_statut
        CHECK (statut IN ('en_attente', 'acceptee', 'refusee', 'expiree', 'chauffeur_sur_place',
                          'en_course', 'terminee', 'absent', 'annulee_passager', 'annulee_chauffeur')),

    CONSTRAINT ck_reservation_places
        CHECK (places BETWEEN 1 AND 8),

    CONSTRAINT ck_reservation_prix
        CHECK (distance_metres > 0 AND prix_par_place > 0 AND prix_total = prix_par_place * places),

    CONSTRAINT fk_reservation_trajet
        FOREIGN KEY (trajet_id)
        REFERENCES trajet(id),

    CONSTRAINT fk_reservation_passager
        FOREIGN KEY (passager_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_reservation_relance
        FOREIGN KEY (relance_de)
        REFERENCES reservation(id)
);


/* discussion entre le passager et le chauffeur d'une réservation */
CREATE TABLE conversation (
    id SERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL UNIQUE,

    CONSTRAINT fk_conversation_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(id)
        ON DELETE CASCADE
);


/* message texte ou vocal, supprimé 24 h après l'envoi */
CREATE TABLE message (
    id SERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    auteur_id BIGINT NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'texte',
    contenu VARCHAR(500),
    audio_url VARCHAR(255),
    audio_secondes INT,
    lu BOOLEAN NOT NULL DEFAULT FALSE,
    date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_message_type
        CHECK (type IN ('texte', 'vocal')),

    CONSTRAINT fk_message_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversation(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_auteur
        FOREIGN KEY (auteur_id)
        REFERENCES utilisateur(id)
);


/* note de 1 à 5 après une course : le passager note le chauffeur et inversement */
CREATE TABLE avis (
    id SERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL,
    auteur_id BIGINT NOT NULL,
    cible_id BIGINT NOT NULL,
    note INT NOT NULL,
    commentaire VARCHAR(500),
    date_avis TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_avis_note
        CHECK (note BETWEEN 1 AND 5),

    CONSTRAINT uq_avis_reservation_auteur
        UNIQUE (reservation_id, auteur_id),

    CONSTRAINT fk_avis_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(id),

    CONSTRAINT fk_avis_auteur
        FOREIGN KEY (auteur_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_avis_cible
        FOREIGN KEY (cible_id)
        REFERENCES utilisateur(id)
);


/* signalement d'un utilisateur ex: absent, comportement, arnaque, ... traité par un admin */
CREATE TABLE signalement (
    id SERIAL PRIMARY KEY,
    auteur_id BIGINT NOT NULL,
    cible_id BIGINT NOT NULL,
    reservation_id BIGINT,
    motif VARCHAR(30) NOT NULL,
    description VARCHAR(1000),
    statut VARCHAR(20) NOT NULL DEFAULT 'nouveau',
    traite_par BIGINT,
    date_signalement TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_signalement_motif
        CHECK (motif IN ('comportement', 'securite', 'arnaque', 'absent', 'vehicule_different', 'autre')),

    CONSTRAINT ck_signalement_statut
        CHECK (statut IN ('nouveau', 'en_cours', 'traite', 'rejete')),

    CONSTRAINT fk_signalement_auteur
        FOREIGN KEY (auteur_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_signalement_cible
        FOREIGN KEY (cible_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_signalement_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(id),

    CONSTRAINT fk_signalement_administrateur
        FOREIGN KEY (traite_par)
        REFERENCES administrateur(id)
);


/* bouton d'urgence pendant une course, avec la position */
CREATE TABLE alerte_sos (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    reservation_id BIGINT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    statut VARCHAR(20) NOT NULL DEFAULT 'ouvert',
    traite_par BIGINT,
    note VARCHAR(500),
    date_alerte TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_sos_statut
        CHECK (statut IN ('ouvert', 'pris_en_charge', 'clos')),

    CONSTRAINT fk_sos_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_sos_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(id),

    CONSTRAINT fk_sos_administrateur
        FOREIGN KEY (traite_par)
        REFERENCES administrateur(id)
);


/* un utilisateur en bloque un autre : ils ne se voient plus dans les recherches */
CREATE TABLE blocage (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    bloque_id BIGINT NOT NULL,

    CONSTRAINT uq_blocage
        UNIQUE (utilisateur_id, bloque_id),

    CONSTRAINT fk_blocage_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id),

    CONSTRAINT fk_blocage_bloque
        FOREIGN KEY (bloque_id)
        REFERENCES utilisateur(id)
);


/* lien de suivi qu'un passager partage avec un proche (WhatsApp, SMS) :
   le proche voit le trajet sans compte, jamais de numéro de téléphone.
   Le lien expire 24 h après la fin de la course. */
CREATE TABLE lien_suivi (
    id SERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL UNIQUE,
    jeton VARCHAR(64) NOT NULL UNIQUE,
    consultations INT NOT NULL DEFAULT 0,
    date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration TIMESTAMPTZ,

    CONSTRAINT fk_lien_suivi_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservation(id)
        ON DELETE CASCADE
);


/* types de notifications coupés par l'utilisateur ex: rappels, messages, badges, ...
   (les notifications importantes : demande, acceptation, sur place, SOS, ne se coupent pas) */
CREATE TABLE preference_notification (
    id SERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL,
    type_notification VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT ck_preference_type
        CHECK (type_notification IN ('rappel_depart', 'nouveau_message', 'demande_avis', 'badge_obtenu', 'trajet_modifie')),

    CONSTRAINT uq_preference_utilisateur_type
        UNIQUE (utilisateur_id, type_notification),

    CONSTRAINT fk_preference_utilisateur
        FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateur(id)
        ON DELETE CASCADE
);


/* =============================================================================
   2. INSERTIONS
   ============================================================================= */

INSERT INTO parametre (cle, valeur, description) VALUES
('delai_reponse_secondes', '180',   'Le chauffeur a 3 minutes pour répondre à une demande'),
('relances_max',           '2',     'Nouvelles demandes possibles au même chauffeur après expiration'),
('rayon_sur_place_metres', '500',   'Distance à partir de laquelle « Je suis déjà sur place » apparaît'),
('attente_minutes',        '10',    'Compte à rebours de 10 min quand le chauffeur est sur place'),
('marge_route_metres',     '30',    'Marge GPS pour savoir si un point est sur la route du chauffeur'),
('frequence_position_secondes', '5', 'Envoi de la position du chauffeur'),
('otp_duree_minutes',      '5',     'Durée de validité du code SMS'),
('trajet_max_jours_avance', '15',   'Un trajet se publie au plus 15 jours à l''avance');


INSERT INTO administrateur (nom_complet, email, mot_de_passe, role, actif, cree_par, derniere_connexion, date_creation) VALUES
('Super Admin Ndaohody', 'superadmin@ndaohody.test', '$2b$10$cCB0iGbrToOyet9D9u5c..ISViIb4eRm8Dv7BaCPk0tZEQiuz6YMa', 'super_admin',  TRUE,  NULL, '2026-11-24 09:00:00+03', '2026-09-25 08:00:00+03'),
('Tolotra Andrianina',   'admin@ndaohody.test',      '$2b$10$cCB0iGbrToOyet9D9u5c..ISViIb4eRm8Dv7BaCPk0tZEQiuz6YMa', 'admin',        TRUE,  1,    '2026-11-24 07:00:00+03', '2026-10-10 08:00:00+03'),
('Investisseur Démo',    'invest@ndaohody.test',     '$2b$10$cCB0iGbrToOyet9D9u5c..ISViIb4eRm8Dv7BaCPk0tZEQiuz6YMa', 'investisseur', TRUE,  1,    '2026-11-22 15:00:00+03', '2026-11-04 08:00:00+03'),
('Ancien Investisseur',  'invest2@ndaohody.test',    '$2b$10$cCB0iGbrToOyet9D9u5c..ISViIb4eRm8Dv7BaCPk0tZEQiuz6YMa', 'investisseur', FALSE, 1,    NULL,                     '2026-11-09 08:00:00+03');


INSERT INTO journal_admin (administrateur_id, action, cible_type, cible_id, details, date_action) VALUES
(1, 'compte.creer',          'administrateur', 2,  'Rôle admin',                         '2026-10-10 08:00:00+03'),
(1, 'compte.creer',          'administrateur', 3,  'Rôle investisseur',                  '2026-11-04 08:00:00+03'),
(1, 'compte.desactiver',     'administrateur', 4,  'Fin de la période d''essai',         '2026-11-19 10:00:00+03'),
(2, 'chauffeur.valider',     'utilisateur',    3,  'Permis, selfie et Hyundai i10 validés', '2026-11-13 09:00:00+03'),
(2, 'chauffeur.refuser',     'utilisateur',    11, 'Permis illisible',                   '2026-10-26 11:00:00+03'),
(2, 'utilisateur.suspendre', 'utilisateur',    10, 'Absences répétées',                  '2026-11-22 16:00:00+03'),
(2, 'sos.clore',             'alerte_sos',     1,  'Fausse manipulation',                '2026-11-23 08:30:00+03'),
(1, 'parametre.modifier',    'parametre',      NULL, 'delai_reponse_secondes : 120 -> 180', '2026-11-23 10:00:00+03');


/* chauffeurs : 1 Rakoto (top), 2 Rasoa (vérifiée), 3 Andry (nouveau), 5 Mamy (moto)
   en cours de vérification : 4 Tiana ; refusé : 11 Zo
   passagers : 6 Hanta (top), 7 Fetra, 8 Lova (nouvelle), 9 ancien compte incomplet,
               10 Sitraka (suspendu), 12 Voahirana */
INSERT INTO utilisateur (telephone, nom, prenom, sexe, photo_url, mode_actuel, statut_chauffeur, statut, badge, note_moyenne, nombre_notes, courses_passager, courses_chauffeur, absences, telephone_verifie, date_creation) VALUES
('+261340000001', 'Rakoto',       'Hery',      'homme', 'https://i.pravatar.cc/300?u=ndaohody-1',  'chauffeur', 'valide',     'actif',    'top',         4.9, 58,  6, 64, 0, TRUE,  '2026-05-08 09:00:00+03'),
('+261340000002', 'Rasoa',        'Fara',      'femme', 'https://i.pravatar.cc/300?u=ndaohody-2',  'chauffeur', 'valide',     'actif',    'verifie',     4.6, 24,  3, 27, 0, TRUE,  '2026-06-27 09:00:00+03'),
('+261340000003', 'Rabe',         'Andry',     'homme', 'https://i.pravatar.cc/300?u=ndaohody-3',  'chauffeur', 'valide',     'actif',    'nouveau',     NULL, 0,  1,  2, 0, TRUE,  '2026-11-12 09:00:00+03'),
('+261340000004', 'Randria',      'Tiana',     'homme', 'https://i.pravatar.cc/300?u=ndaohody-4',  'chauffeur', 'en_attente', 'actif',    'non_verifie', NULL, 0,  0,  0, 0, TRUE,  '2026-11-23 09:00:00+03'),
('+261340000005', 'Razafy',       'Mamy',      'homme', 'https://i.pravatar.cc/300?u=ndaohody-5',  'chauffeur', 'valide',     'actif',    'verifie',     4.3, 12,  0, 15, 0, TRUE,  '2026-08-26 09:00:00+03'),
('+261340000006', 'Ravelo',       'Hanta',     'femme', 'https://i.pravatar.cc/300?u=ndaohody-6',  'passager',  'aucun',      'actif',    'top',         4.8, 31, 34,  0, 0, TRUE,  '2026-05-28 09:00:00+03'),
('+261340000007', 'Andriamanana', 'Fetra',     'homme', 'https://i.pravatar.cc/300?u=ndaohody-7',  'passager',  'aucun',      'actif',    'verifie',     4.5,  6,  8,  0, 0, TRUE,  '2026-09-25 09:00:00+03'),
('+261340000008', 'Rakotomalala', 'Lova',      'femme', 'https://i.pravatar.cc/300?u=ndaohody-8',  'passager',  'aucun',      'actif',    'nouveau',     NULL, 0,  1,  0, 0, TRUE,  '2026-11-19 09:00:00+03'),
('+261340000009', NULL,           NULL,        NULL,    NULL,                                      'passager',  'aucun',      'actif',    'non_verifie', NULL, 0,  0,  0, 0, FALSE, '2026-01-28 09:00:00+03'),
('+261340000010', 'Rajaona',      'Sitraka',   'homme', NULL,                                      'passager',  'aucun',      'suspendu', 'non_verifie', 3.2,  5,  5,  0, 3, TRUE,  '2026-08-16 09:00:00+03'),
('+261340000011', 'Ranaivo',      'Zo',        'homme', 'https://i.pravatar.cc/300?u=ndaohody-11', 'passager',  'refuse',     'actif',    'nouveau',     NULL, 0,  2,  0, 0, TRUE,  '2026-10-25 09:00:00+03'),
('+261340000012', 'Rasolofo',     'Voahirana', 'femme', 'https://i.pravatar.cc/300?u=ndaohody-12', 'passager',  'aucun',      'actif',    'verifie',     4.7,  9, 11,  0, 0, TRUE,  '2026-09-10 09:00:00+03');


/* code SMS en attente pour un nouveau numéro (le code est 123456) */
INSERT INTO code_otp (telephone, code_hash, essais, date_expiration, date_creation) VALUES
('+261340000099', '$2b$10$W4Wd80k2oztZM1L6M1FWxO4C.0Yte7NI2olkYMa50wFESrbwElgSi', 0, '2026-11-24 10:04:00+03', '2026-11-24 09:59:00+03');


INSERT INTO document_chauffeur (utilisateur_id, type, fichier_url, statut, motif_refus, verifie_par, date_envoi) VALUES
(1,  'permis_recto', '/prive/documents/1/permis_recto.jpg',  'valide',     NULL, 2, '2026-05-08 10:00:00+03'),
(1,  'permis_verso', '/prive/documents/1/permis_verso.jpg',  'valide',     NULL, 2, '2026-05-08 10:00:00+03'),
(1,  'selfie',       '/prive/documents/1/selfie.jpg',        'valide',     NULL, 2, '2026-05-08 10:00:00+03'),
(2,  'permis_recto', '/prive/documents/2/permis_recto.jpg',  'valide',     NULL, 1, '2026-06-27 10:00:00+03'),
(2,  'permis_verso', '/prive/documents/2/permis_verso.jpg',  'valide',     NULL, 1, '2026-06-27 10:00:00+03'),
(2,  'selfie',       '/prive/documents/2/selfie.jpg',        'valide',     NULL, 1, '2026-06-27 10:00:00+03'),
(3,  'permis_recto', '/prive/documents/3/permis_recto.jpg',  'valide',     NULL, 2, '2026-11-12 10:00:00+03'),
(3,  'permis_verso', '/prive/documents/3/permis_verso.jpg',  'valide',     NULL, 2, '2026-11-12 10:00:00+03'),
(3,  'selfie',       '/prive/documents/3/selfie.jpg',        'valide',     NULL, 2, '2026-11-12 10:00:00+03'),
(4,  'permis_recto', '/prive/documents/4/permis_recto.jpg',  'en_attente', NULL, NULL, '2026-11-23 10:00:00+03'),
(4,  'permis_verso', '/prive/documents/4/permis_verso.jpg',  'en_attente', NULL, NULL, '2026-11-23 10:00:00+03'),
(4,  'selfie',       '/prive/documents/4/selfie.jpg',        'en_attente', NULL, NULL, '2026-11-23 10:00:00+03'),
(5,  'permis_recto', '/prive/documents/5/permis_recto.jpg',  'valide',     NULL, 2, '2026-08-26 10:00:00+03'),
(5,  'permis_verso', '/prive/documents/5/permis_verso.jpg',  'valide',     NULL, 2, '2026-08-26 10:00:00+03'),
(5,  'selfie',       '/prive/documents/5/selfie.jpg',        'valide',     NULL, 2, '2026-08-26 10:00:00+03'),
(11, 'permis_recto', '/prive/documents/11/permis_recto.jpg', 'refuse',     'Permis illisible, merci de renvoyer une photo nette', 2, '2026-10-25 10:00:00+03'),
(11, 'permis_verso', '/prive/documents/11/permis_verso.jpg', 'refuse',     'Permis illisible, merci de renvoyer une photo nette', 2, '2026-10-25 10:00:00+03'),
(11, 'selfie',       '/prive/documents/11/selfie.jpg',       'valide',     NULL, 2, '2026-10-25 10:00:00+03');


INSERT INTO vehicule (utilisateur_id, type, marque, modele, couleur, immatriculation, places, photo_url, par_defaut, statut, motif_refus) VALUES
(1,  'voiture', 'Toyota',  'Corolla', 'Gris',  '1234 TBA', 4, '/mock/vehicules/1.jpg', TRUE,  'valide',     NULL),
(1,  'moto',    'Honda',   'CB 125',  'Noir',  '5678 TBB', 1, '/mock/vehicules/2.jpg', FALSE, 'valide',     NULL),
(2,  'voiture', 'Peugeot', '206',     'Rouge', '2468 TBC', 3, '/mock/vehicules/3.jpg', TRUE,  'valide',     NULL),
(3,  'voiture', 'Hyundai', 'i10',     'Blanc', '1357 TBD', 3, '/mock/vehicules/4.jpg', TRUE,  'valide',     NULL),
(5,  'moto',    'Yamaha',  'YBR 125', 'Bleu',  '9753 TBE', 1, '/mock/vehicules/5.jpg', TRUE,  'valide',     NULL),
(4,  'voiture', 'Renault', 'Clio',    'Vert',  '8642 TBF', 4, '/mock/vehicules/6.jpg', TRUE,  'en_attente', NULL),
(11, 'voiture', 'Toyota',  'Starlet', 'Beige', '1122 TBG', 3, '/mock/vehicules/7.jpg', TRUE,  'refuse',     'Photo du véhicule sans plaque visible');


INSERT INTO quartier (nom, latitude, longitude) VALUES
('Andoharanofotsy', -18.9850000, 47.5330000),
('Tanjombato',      -18.9600000, 47.5280000),
('Ankadimbahoaka',  -18.9420000, 47.5250000),
('Anosy',           -18.9160000, 47.5210000),
('Analakely',       -18.9067000, 47.5253000),
('Ivato',           -18.7969000, 47.4788000),
('Talatamaty',      -18.8350000, 47.4630000),
('Andraharo',       -18.8880000, 47.5150000),
('Ankorondrano',    -18.8890000, 47.5240000),
('Behoririka',      -18.9010000, 47.5300000),
('Itaosy',          -18.9230000, 47.4710000),
('Andavamamba',     -18.9220000, 47.5130000),
('Mahamasina',      -18.9180000, 47.5240000),
('Ambanidia',       -18.9200000, 47.5370000),
('Ankatso',         -18.9180000, 47.5560000),
('Ivandry',         -18.8740000, 47.5280000),
('Ampefiloha',      -18.9120000, 47.5140000),
('67 Ha',           -18.9030000, 47.5110000),
('Isotry',          -18.9100000, 47.5120000),
('Ambohibao',       -18.8600000, 47.4700000);


/* voiture : 300 Ar/km, au moins 3 000 Ar la place ; moto : 500 Ar/km, au moins 5 000 Ar */
INSERT INTO tarif (type_vehicule, prix_minimum, prix_par_km, arrondi) VALUES
('voiture', 3000, 300, 100),
('moto',    5000, 500, 100);


/* trajets (chemins simplifiés ; en vrai ils viennent de Mapbox)
   1 Rakoto   immédiat   EN ROUTE  Andoharanofotsy -> Analakely
   2 Rasoa    demain 7h  PUBLIÉ    Ivato -> Analakely
   3 Andry    11h        PUBLIÉ    Itaosy -> Ankatso
   4 Mamy     immédiat   EN COURS  Ivandry -> Analakely (moto)
   5 Rakoto   demain 17h30 PUBLIÉ  Analakely -> Andoharanofotsy (sens inverse du 1)
   6 Rasoa    hier 8h    TERMINÉ   67 Ha -> Anosy
   7 Andry    demain 9h  ANNULÉ    67 Ha -> Anosy
   8 Rasoa    immédiat   EN ROUTE  Itaosy -> Anosy, RÉSERVÉ AUX FEMMES */
INSERT INTO trajet (chauffeur_id, vehicule_id, type, statut, depart_libelle, depart_latitude, depart_longitude, arrivee_libelle, arrivee_latitude, arrivee_longitude, chemin, distance_metres, duree_secondes, date_depart, places_total, places_libres, date_annulation, date_fin, reserve_femmes) VALUES
(1, 1, 'immediat',   'en_route', 'Andoharanofotsy, rond-point', -18.9850000, 47.5330000, 'Analakely, avenue de l''Indépendance', -18.9067000, 47.5253000,
    '[[47.5330,-18.9850],[47.5280,-18.9600],[47.5250,-18.9420],[47.5210,-18.9160],[47.5253,-18.9067]]', 8910, 1458, '2026-11-24 09:54:00+03', 4, 3, NULL, NULL, FALSE),
(2, 3, 'a_l_avance', 'publie',   'Ivato, aéroport', -18.7969000, 47.4788000, 'Analakely, marché', -18.9067000, 47.5253000,
    '[[47.4788,-18.7969],[47.4630,-18.8350],[47.5150,-18.8880],[47.5240,-18.8890],[47.5300,-18.9010],[47.5253,-18.9067]]', 15800, 2585, '2026-11-25 07:00:00+03', 3, 1, NULL, NULL, FALSE),
(3, 4, 'a_l_avance', 'publie',   'Itaosy, église', -18.9230000, 47.4710000, 'Ankatso, université', -18.9180000, 47.5560000,
    '[[47.4710,-18.9230],[47.5130,-18.9220],[47.5210,-18.9160],[47.5240,-18.9180],[47.5370,-18.9200],[47.5560,-18.9180]]', 9260, 1515, '2026-11-24 11:00:00+03', 3, 3, NULL, NULL, FALSE),
(5, 5, 'immediat',   'en_cours', 'Ivandry, Galaxy', -18.8740000, 47.5280000, 'Analakely, Hôtel de ville', -18.9067000, 47.5253000,
    '[[47.5280,-18.8740],[47.5240,-18.8890],[47.5300,-18.9010],[47.5253,-18.9067]]', 3990, 653, '2026-11-24 09:45:00+03', 1, 0, NULL, NULL, FALSE),
(1, 1, 'a_l_avance', 'publie',   'Analakely, avenue de l''Indépendance', -18.9067000, 47.5253000, 'Andoharanofotsy, rond-point', -18.9850000, 47.5330000,
    '[[47.5253,-18.9067],[47.5210,-18.9160],[47.5250,-18.9420],[47.5280,-18.9600],[47.5330,-18.9850]]', 8910, 1458, '2026-11-25 17:30:00+03', 4, 4, NULL, NULL, FALSE),
(2, 3, 'a_l_avance', 'termine',  '67 Ha, marché', -18.9030000, 47.5110000, 'Anosy, lac', -18.9160000, 47.5210000,
    '[[47.5110,-18.9030],[47.5120,-18.9100],[47.5140,-18.9120],[47.5210,-18.9160]]', 1950, 319, '2026-11-23 08:00:00+03', 3, 3, NULL, '2026-11-23 08:40:00+03', FALSE),
(3, 4, 'a_l_avance', 'annule',   '67 Ha, marché', -18.9030000, 47.5110000, 'Anosy, lac', -18.9160000, 47.5210000,
    '[[47.5110,-18.9030],[47.5120,-18.9100],[47.5140,-18.9120],[47.5210,-18.9160]]', 1950, 319, '2026-11-25 09:00:00+03', 3, 3, '2026-11-24 09:30:00+03', NULL, FALSE),
(2, 3, 'immediat',   'en_route', 'Itaosy, église', -18.9230000, 47.4710000, 'Anosy, lac', -18.9160000, 47.5210000,
    '[[47.4710,-18.9230],[47.5130,-18.9220],[47.5210,-18.9160]]', 5480, 897, '2026-11-24 09:48:00+03', 3, 2, NULL, NULL, TRUE);


INSERT INTO position_chauffeur (chauffeur_id, trajet_id, latitude, longitude, en_ligne, date_mise_a_jour) VALUES
(1, 1,    -18.9750000, 47.5310000, TRUE,  '2026-11-24 10:00:00+03'),
(5, 4,    -18.9039000, 47.5277000, TRUE,  '2026-11-24 10:00:00+03'),
(2, 8,    -18.9221000, 47.5088000, TRUE,  '2026-11-24 10:00:00+03'),
(3, NULL, -18.9235000, 47.4760000, FALSE, '2026-11-24 09:20:00+03');


/* réservations
   1  Hanta     trajet 1  acceptée : le chauffeur arrive
   2  Fetra     trajet 1  en attente : expire à 10h02
   3  Lova      trajet 4  en course : à bord
   4  Voahirana trajet 2  acceptée (2 places)
   5  Fetra     trajet 2  expirée : pas de réponse en 3 minutes
   6  Fetra     trajet 2  relance de la 5, en attente
   7  Hanta     trajet 6  terminée
   8  Voahirana trajet 6  terminée
   9  Lova      trajet 3  refusée
   10 Sitraka   trajet 6  absent (1 prolongation)
   11 Voahirana trajet 8  chauffeur sur place : fin de l'attente à 10h12
   12 Fetra     trajet 7  annulée par le chauffeur */
INSERT INTO reservation (trajet_id, passager_id, places, distance_metres, prix_par_place, prix_total, prise_en_charge_libelle, prise_en_charge_latitude, prise_en_charge_longitude, depose_libelle, depose_latitude, depose_longitude, statut, relance_de, date_demande, date_expiration, date_reponse, date_sur_place, fin_attente, prolongations, date_debut_course, date_fin_course, date_annulation) VALUES
(1, 6,  1, 6051, 3000, 3000,  'Tanjombato, arrêt Jumbo',     -18.9600000, 47.5280000, 'Analakely, avenue de l''Indépendance', -18.9067000, 47.5253000, 'acceptee',            NULL, '2026-11-24 09:56:00+03', '2026-11-24 09:59:00+03', '2026-11-24 09:57:00+03', NULL, NULL, 0, NULL, NULL, NULL),
(1, 7,  1, 2909, 3000, 3000,  'Ankadimbahoaka, pharmacie',   -18.9420000, 47.5250000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'en_attente',          NULL, '2026-11-24 09:59:00+03', '2026-11-24 10:02:00+03', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(4, 8,  1, 2273, 5000, 5000,  'Ankorondrano, Zone Galaxy',   -18.8890000, 47.5240000, 'Analakely, Hôtel de ville',            -18.9067000, 47.5253000, 'en_course',           NULL, '2026-11-24 09:46:00+03', '2026-11-24 09:49:00+03', '2026-11-24 09:47:00+03', '2026-11-24 09:51:00+03', '2026-11-24 10:06:00+03', 0, '2026-11-24 09:53:00+03', NULL, NULL),
(2, 12, 2, 2426, 3000, 6000,  'Andraharo, rond-point',       -18.8880000, 47.5150000, 'Behoririka, lac',                      -18.9010000, 47.5300000, 'acceptee',            NULL, '2026-11-24 06:00:00+03', '2026-11-24 06:03:00+03', '2026-11-24 06:02:00+03', NULL, NULL, 0, NULL, NULL, NULL),
(2, 7,  1, 8982, 3000, 3000,  'Talatamaty, marché',          -18.8350000, 47.4630000, 'Ankorondrano, Zone Galaxy',            -18.8890000, 47.5240000, 'expiree',             NULL, '2026-11-24 09:50:00+03', '2026-11-24 09:53:00+03', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(2, 7,  1, 8982, 3000, 3000,  'Talatamaty, marché',          -18.8350000, 47.4630000, 'Ankorondrano, Zone Galaxy',            -18.8890000, 47.5240000, 'en_attente',          5,    '2026-11-24 09:59:30+03', '2026-11-24 10:02:30+03', NULL, NULL, NULL, 0, NULL, NULL, NULL),
(6, 6,  1, 1948, 3000, 3000,  '67 Ha, marché',               -18.9030000, 47.5110000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'terminee',            NULL, '2026-11-22 20:00:00+03', '2026-11-22 20:03:00+03', '2026-11-22 20:01:00+03', '2026-11-23 07:58:00+03', '2026-11-23 08:13:00+03', 0, '2026-11-23 08:02:00+03', '2026-11-23 08:35:00+03', NULL),
(6, 12, 1, 1166, 3000, 3000,  'Isotry, Cité',                -18.9100000, 47.5120000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'terminee',            NULL, '2026-11-22 21:10:00+03', '2026-11-22 21:13:00+03', '2026-11-22 21:12:00+03', '2026-11-23 08:04:00+03', '2026-11-23 08:19:00+03', 0, '2026-11-23 08:06:00+03', '2026-11-23 08:38:00+03', NULL),
(3, 8,  1, 3787, 3000, 3000,  'Anosy, lac',                  -18.9160000, 47.5210000, 'Ankatso, université',                  -18.9180000, 47.5560000, 'refusee',             NULL, '2026-11-24 08:30:00+03', '2026-11-24 08:33:00+03', '2026-11-24 08:31:00+03', NULL, NULL, 0, NULL, NULL, NULL),
(6, 10, 1,  860, 3000, 3000,  'Ampefiloha, gare',            -18.9120000, 47.5140000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'absent',              NULL, '2026-11-22 22:00:00+03', '2026-11-22 22:03:00+03', '2026-11-22 22:01:00+03', '2026-11-23 08:05:00+03', '2026-11-23 08:35:00+03', 1, NULL, NULL, NULL),
(8, 12, 1, 1073, 3000, 3000,  'Andavamamba, carrefour',      -18.9220000, 47.5130000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'chauffeur_sur_place', NULL, '2026-11-24 09:49:00+03', '2026-11-24 09:52:00+03', '2026-11-24 09:50:00+03', '2026-11-24 09:57:00+03', '2026-11-24 10:12:00+03', 0, NULL, NULL, NULL),
(7, 7,  1, 1948, 3000, 3000,  '67 Ha, marché',               -18.9030000, 47.5110000, 'Anosy, lac',                           -18.9160000, 47.5210000, 'annulee_chauffeur',   NULL, '2026-11-23 10:00:00+03', '2026-11-23 10:03:00+03', '2026-11-23 10:01:00+03', NULL, NULL, 0, NULL, NULL, '2026-11-24 09:30:00+03');


INSERT INTO conversation (reservation_id) VALUES
(1),
(4),
(11);


INSERT INTO message (conversation_id, auteur_id, type, contenu, audio_url, audio_secondes, lu, date_envoi) VALUES
(1, 1,  'texte', 'Bonjour, j''arrive dans 5 minutes.',                  NULL, NULL, TRUE,  '2026-11-24 09:57:30+03'),
(1, 6,  'texte', 'D''accord, je suis devant le Jumbo, veste rouge.',    NULL, NULL, FALSE, '2026-11-24 09:58:00+03'),
(2, 12, 'texte', 'Bonjour, nous serons deux avec une valise.',          NULL, NULL, TRUE,  '2026-11-24 06:05:00+03'),
(2, 2,  'vocal', NULL, '/prive/vocaux/2/1.ogg', 12,                                 TRUE,  '2026-11-24 06:10:00+03'),
(3, 2,  'texte', 'Je suis au carrefour d''Andavamamba, voiture rouge.', NULL, NULL, FALSE, '2026-11-24 09:57:00+03');


INSERT INTO avis (reservation_id, auteur_id, cible_id, note, commentaire, date_avis) VALUES
(7, 6,  2, 5, 'Très ponctuelle et conduite prudente.', '2026-11-23 09:10:00+03'),
(7, 2,  6, 5, 'Passagère à l''heure, merci !',          '2026-11-23 09:30:00+03'),
(8, 12, 2, 4, 'Bien, un peu de retard au départ.',     '2026-11-23 10:00:00+03');


INSERT INTO signalement (auteur_id, cible_id, reservation_id, motif, description, statut, traite_par, date_signalement) VALUES
(2, 10, 10, 'absent',       'Le passager n''est pas venu malgré 30 minutes d''attente.', 'nouveau', NULL, '2026-11-23 08:40:00+03'),
(7, 3,  12, 'comportement', 'Annulation 30 minutes avant le départ.',                    'traite',  2,    '2026-11-24 09:35:00+03');


INSERT INTO alerte_sos (utilisateur_id, reservation_id, latitude, longitude, statut, traite_par, note, date_alerte) VALUES
(6, 7, -18.9120000, 47.5140000, 'clos', 2, 'Fausse manipulation, passagère rappelée : tout va bien.', '2026-11-23 08:20:00+03');


INSERT INTO blocage (utilisateur_id, bloque_id) VALUES
(6, 10);


/* Hanta (réservation 1) et Voahirana (réservation 11) ont partagé leur trajet avec un proche */
INSERT INTO lien_suivi (reservation_id, jeton, consultations, date_creation, date_expiration) VALUES
(1,  'k3J9vQ2mX7pL0aR5tY8wZ1cB4nD6fG2hS9uE3iO7', 2, '2026-11-24 09:58:00+03', NULL),
(11, 'p8T1yU4rE7wQ0oI3uY6tR9eW2qA5sD8fG1hJ4kL7', 0, '2026-11-24 09:51:00+03', NULL),
(7,  'z2X5cV8bN1mQ4wE7rT0yU3iO6pA9sD2fG5hJ8kL1', 5, '2026-11-23 07:55:00+03', '2026-11-24 08:35:00+03');


/* préférences : Fetra coupe les rappels, Hanta coupe les badges et garde les messages */
INSERT INTO preference_notification (utilisateur_id, type_notification, active) VALUES
(7, 'rappel_depart',   FALSE),
(6, 'badge_obtenu',    FALSE),
(6, 'nouveau_message', TRUE);
