import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: the 20 tables of donnees.sql (French names kept on purpose, see CLAUDE.md),
 * plus PostGIS columns computed from latitude / longitude and the indexes used by the search.
 *
 * Never edit this migration once it is merged: add a new migration instead.
 */
export class InitialSchema1795478400000 implements MigrationInterface {
  name = 'InitialSchema1795478400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(`
      CREATE TABLE parametre (
        cle VARCHAR(100) PRIMARY KEY,
        valeur VARCHAR(255) NOT NULL,
        description VARCHAR(255)
      );

      CREATE TABLE administrateur (
        id SERIAL PRIMARY KEY,
        nom_complet VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        mot_de_passe VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        actif BOOLEAN NOT NULL DEFAULT TRUE,
        cree_par BIGINT,
        derniere_connexion TIMESTAMPTZ,
        date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT ck_administrateur_role CHECK (role IN ('super_admin', 'admin', 'investisseur')),
        CONSTRAINT fk_administrateur_createur FOREIGN KEY (cree_par) REFERENCES administrateur(id)
      );

      CREATE TABLE journal_admin (
        id SERIAL PRIMARY KEY,
        administrateur_id BIGINT NOT NULL,
        action VARCHAR(100) NOT NULL,
        cible_type VARCHAR(50),
        cible_id BIGINT,
        details TEXT,
        date_action TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_journal_administrateur FOREIGN KEY (administrateur_id) REFERENCES administrateur(id)
      );

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
        date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT ck_utilisateur_sexe CHECK (sexe IN ('homme', 'femme')),
        CONSTRAINT ck_utilisateur_mode CHECK (mode_actuel IN ('passager', 'chauffeur')),
        CONSTRAINT ck_utilisateur_statut_chauffeur CHECK (statut_chauffeur IN ('aucun', 'en_attente', 'valide', 'refuse', 'suspendu')),
        CONSTRAINT ck_utilisateur_statut CHECK (statut IN ('actif', 'suspendu', 'supprime')),
        CONSTRAINT ck_utilisateur_badge CHECK (badge IN ('nouveau', 'non_verifie', 'verifie', 'top')),
        CONSTRAINT ck_utilisateur_note CHECK (note_moyenne BETWEEN 1 AND 5)
      );

      CREATE TABLE code_otp (
        id SERIAL PRIMARY KEY,
        telephone VARCHAR(20) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        essais INT NOT NULL DEFAULT 0,
        date_expiration TIMESTAMPTZ NOT NULL,
        date_utilisation TIMESTAMPTZ,
        date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE document_chauffeur (
        id SERIAL PRIMARY KEY,
        utilisateur_id BIGINT NOT NULL,
        type VARCHAR(20) NOT NULL,
        fichier_url VARCHAR(255) NOT NULL,
        statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
        motif_refus VARCHAR(255),
        verifie_par BIGINT,
        date_envoi TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT ck_document_type CHECK (type IN ('permis_recto', 'permis_verso', 'selfie')),
        CONSTRAINT ck_document_statut CHECK (statut IN ('en_attente', 'valide', 'refuse')),
        CONSTRAINT fk_document_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE,
        CONSTRAINT fk_document_administrateur FOREIGN KEY (verifie_par) REFERENCES administrateur(id)
      );

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
        CONSTRAINT ck_vehicule_type CHECK (type IN ('moto', 'voiture')),
        CONSTRAINT ck_vehicule_places CHECK (places BETWEEN 1 AND 8 AND (type = 'voiture' OR places = 1)),
        CONSTRAINT ck_vehicule_statut CHECK (statut IN ('en_attente', 'valide', 'refuse', 'archive')),
        CONSTRAINT fk_vehicule_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
      );

      CREATE TABLE quartier (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        centre_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography) STORED
      );

      CREATE TABLE palier_prix (
        id SERIAL PRIMARY KEY,
        km_max DECIMAL(5,1),
        prix_max INT NOT NULL
      );

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
        prix_par_place INT NOT NULL,
        date_annulation TIMESTAMPTZ,
        date_fin TIMESTAMPTZ,
        reserve_femmes BOOLEAN NOT NULL DEFAULT FALSE,
        depart_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(depart_longitude::float8, depart_latitude::float8), 4326)::geography) STORED,
        arrivee_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(arrivee_longitude::float8, arrivee_latitude::float8), 4326)::geography) STORED,
        chemin_geo geography(LineString, 4326)
          GENERATED ALWAYS AS (
            ST_SetSRID(ST_GeomFromGeoJSON('{"type":"LineString","coordinates":' || chemin::text || '}'), 4326)::geography
          ) STORED,
        CONSTRAINT ck_trajet_type CHECK (type IN ('a_l_avance', 'immediat')),
        CONSTRAINT ck_trajet_statut CHECK (statut IN ('publie', 'en_route', 'en_cours', 'termine', 'annule')),
        CONSTRAINT ck_trajet_places CHECK (places_libres BETWEEN 0 AND places_total),
        CONSTRAINT fk_trajet_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_trajet_vehicule FOREIGN KEY (vehicule_id) REFERENCES vehicule(id)
      );

      CREATE TABLE position_chauffeur (
        chauffeur_id BIGINT PRIMARY KEY,
        trajet_id BIGINT,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        en_ligne BOOLEAN NOT NULL DEFAULT TRUE,
        date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT now(),
        position_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography) STORED,
        CONSTRAINT fk_position_chauffeur FOREIGN KEY (chauffeur_id) REFERENCES utilisateur(id) ON DELETE CASCADE,
        CONSTRAINT fk_position_trajet FOREIGN KEY (trajet_id) REFERENCES trajet(id)
      );

      CREATE TABLE reservation (
        id SERIAL PRIMARY KEY,
        trajet_id BIGINT NOT NULL,
        passager_id BIGINT NOT NULL,
        places INT NOT NULL DEFAULT 1,
        prix_total INT NOT NULL,
        prise_en_charge_libelle VARCHAR(150) NOT NULL,
        prise_en_charge_latitude DECIMAL(10,7) NOT NULL,
        prise_en_charge_longitude DECIMAL(10,7) NOT NULL,
        depose_libelle VARCHAR(150) NOT NULL,
        depose_latitude DECIMAL(10,7) NOT NULL,
        depose_longitude DECIMAL(10,7) NOT NULL,
        statut VARCHAR(30) NOT NULL DEFAULT 'en_attente',
        relance_de BIGINT,
        date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_expiration TIMESTAMPTZ NOT NULL,
        date_reponse TIMESTAMPTZ,
        date_sur_place TIMESTAMPTZ,
        fin_attente TIMESTAMPTZ,
        prolongations INT NOT NULL DEFAULT 0,
        date_debut_course TIMESTAMPTZ,
        date_fin_course TIMESTAMPTZ,
        date_annulation TIMESTAMPTZ,
        prise_en_charge_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(prise_en_charge_longitude::float8, prise_en_charge_latitude::float8), 4326)::geography) STORED,
        depose_geo geography(Point, 4326)
          GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(depose_longitude::float8, depose_latitude::float8), 4326)::geography) STORED,
        CONSTRAINT ck_reservation_statut CHECK (statut IN ('en_attente', 'acceptee', 'refusee', 'expiree', 'chauffeur_sur_place',
                                                           'en_course', 'terminee', 'absent', 'annulee_passager', 'annulee_chauffeur')),
        CONSTRAINT ck_reservation_places CHECK (places BETWEEN 1 AND 8),
        CONSTRAINT fk_reservation_trajet FOREIGN KEY (trajet_id) REFERENCES trajet(id),
        CONSTRAINT fk_reservation_passager FOREIGN KEY (passager_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_reservation_relance FOREIGN KEY (relance_de) REFERENCES reservation(id)
      );

      CREATE TABLE conversation (
        id SERIAL PRIMARY KEY,
        reservation_id BIGINT NOT NULL UNIQUE,
        CONSTRAINT fk_conversation_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE CASCADE
      );

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
        CONSTRAINT ck_message_type CHECK (type IN ('texte', 'vocal')),
        CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
        CONSTRAINT fk_message_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateur(id)
      );

      CREATE TABLE avis (
        id SERIAL PRIMARY KEY,
        reservation_id BIGINT NOT NULL,
        auteur_id BIGINT NOT NULL,
        cible_id BIGINT NOT NULL,
        note INT NOT NULL,
        commentaire VARCHAR(500),
        date_avis TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT ck_avis_note CHECK (note BETWEEN 1 AND 5),
        CONSTRAINT ck_avis_pas_soi_meme CHECK (auteur_id <> cible_id),
        CONSTRAINT uq_avis_reservation_auteur UNIQUE (reservation_id, auteur_id),
        CONSTRAINT fk_avis_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id),
        CONSTRAINT fk_avis_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_avis_cible FOREIGN KEY (cible_id) REFERENCES utilisateur(id)
      );

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
        CONSTRAINT ck_signalement_motif CHECK (motif IN ('comportement', 'securite', 'arnaque', 'absent', 'vehicule_different', 'autre')),
        CONSTRAINT ck_signalement_statut CHECK (statut IN ('nouveau', 'en_cours', 'traite', 'rejete')),
        CONSTRAINT fk_signalement_auteur FOREIGN KEY (auteur_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_signalement_cible FOREIGN KEY (cible_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_signalement_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id),
        CONSTRAINT fk_signalement_administrateur FOREIGN KEY (traite_par) REFERENCES administrateur(id)
      );

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
        CONSTRAINT ck_sos_statut CHECK (statut IN ('ouvert', 'pris_en_charge', 'clos')),
        CONSTRAINT fk_sos_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_sos_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id),
        CONSTRAINT fk_sos_administrateur FOREIGN KEY (traite_par) REFERENCES administrateur(id)
      );

      CREATE TABLE blocage (
        id SERIAL PRIMARY KEY,
        utilisateur_id BIGINT NOT NULL,
        bloque_id BIGINT NOT NULL,
        CONSTRAINT uq_blocage UNIQUE (utilisateur_id, bloque_id),
        CONSTRAINT ck_blocage_pas_soi_meme CHECK (utilisateur_id <> bloque_id),
        CONSTRAINT fk_blocage_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id),
        CONSTRAINT fk_blocage_bloque FOREIGN KEY (bloque_id) REFERENCES utilisateur(id)
      );

      CREATE TABLE lien_suivi (
        id SERIAL PRIMARY KEY,
        reservation_id BIGINT NOT NULL UNIQUE,
        jeton VARCHAR(64) NOT NULL UNIQUE,
        consultations INT NOT NULL DEFAULT 0,
        date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
        date_expiration TIMESTAMPTZ,
        CONSTRAINT fk_lien_suivi_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(id) ON DELETE CASCADE
      );

      CREATE TABLE preference_notification (
        id SERIAL PRIMARY KEY,
        utilisateur_id BIGINT NOT NULL,
        type_notification VARCHAR(50) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT ck_preference_type CHECK (type_notification IN ('rappel_depart', 'nouveau_message', 'demande_avis', 'badge_obtenu', 'trajet_modifie')),
        CONSTRAINT uq_preference_utilisateur_type UNIQUE (utilisateur_id, type_notification),
        CONSTRAINT fk_preference_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
      );
    `);

    // Indexes: geographic search, frequent filters and business rules enforced by the database.
    await queryRunner.query(`
      CREATE INDEX idx_quartier_centre_geo ON quartier USING GIST (centre_geo);
      CREATE INDEX idx_trajet_chemin_geo ON trajet USING GIST (chemin_geo);
      CREATE INDEX idx_trajet_statut_depart ON trajet (statut, date_depart);
      CREATE INDEX idx_trajet_chauffeur ON trajet (chauffeur_id, date_depart DESC);
      CREATE UNIQUE INDEX uq_trajet_un_seul_en_route ON trajet (chauffeur_id) WHERE statut IN ('en_route', 'en_cours');
      CREATE INDEX idx_position_chauffeur_geo ON position_chauffeur USING GIST (position_geo);
      CREATE UNIQUE INDEX uq_vehicule_un_par_defaut ON vehicule (utilisateur_id) WHERE par_defaut;
      CREATE UNIQUE INDEX uq_reservation_une_active ON reservation (trajet_id, passager_id)
        WHERE statut IN ('en_attente', 'acceptee', 'chauffeur_sur_place', 'en_course');
      CREATE INDEX idx_reservation_passager ON reservation (passager_id, statut);
      CREATE INDEX idx_reservation_trajet ON reservation (trajet_id, statut);
      CREATE INDEX idx_reservation_expiration ON reservation (date_expiration) WHERE statut = 'en_attente';
      CREATE INDEX idx_reservation_fin_attente ON reservation (fin_attente) WHERE statut = 'chauffeur_sur_place';
      CREATE INDEX idx_message_conversation ON message (conversation_id, date_envoi);
      CREATE INDEX idx_code_otp_telephone ON code_otp (telephone, date_creation DESC);
      CREATE INDEX idx_journal_admin_administrateur ON journal_admin (administrateur_id, date_action DESC);
      CREATE INDEX idx_signalement_statut ON signalement (statut, date_signalement DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS preference_notification, lien_suivi, blocage, alerte_sos, signalement, avis, message,
        conversation, reservation, position_chauffeur, trajet, palier_prix, quartier, vehicule,
        document_chauffeur, code_otp, utilisateur, journal_admin, administrateur, parametre CASCADE
    `);
  }
}
