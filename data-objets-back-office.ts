/* =============================================================================
   NDAOHODY — Data objects du back-office
   Objets échangés entre l'API /api/admin et le back-office (super_admin, admin, investisseur).
   Complète data-objets.ts (Administrateur, RoleAdmin, TableauDeBord, Vehicule... y restent).
   Dates : chaînes ISO 8601.  Montants : entiers en Ariary.  Taux : de 0 à 1.

   Côté back-office, les menus et les boutons s'affichent selon `permissions`
   (renvoyé par la connexion et par /admin/auth/me) : ne jamais tester le rôle directement.
   ============================================================================= */

import type {
  Administrateur,
  DocumentChauffeur,
  RoleAdmin,
  StatutChauffeur,
  TypeDocument,
  Vehicule,
} from './data-objets';


/* ---------------------------------------------------------------------------
   Actions permises (une action = un menu ou un bouton du back-office)
   --------------------------------------------------------------------------- */
export type ActionAdmin =
  // Comptes du back-office (super_admin)
  | 'comptes.voir'
  | 'comptes.creer'
  | 'comptes.activer'                       // désactiver / réactiver
  | 'comptes.reinitialiser_mot_de_passe'
  | 'journal.voir'                          // journal des actions (étape 14)
  // Dossiers chauffeurs et véhicules (super_admin, admin)
  | 'chauffeurs.dossiers.voir'
  | 'chauffeurs.dossiers.decider'           // valider / refuser
  | 'vehicules.voir'
  | 'vehicules.decider'                     // valider / refuser
  // Gestion de l'activité (super_admin, admin — étape 14)
  | 'chauffeurs.voir'
  | 'chauffeurs.suspendre'
  | 'utilisateurs.voir'
  | 'utilisateurs.suspendre'
  | 'recherche'
  | 'trajets.voir'
  | 'trajets.annuler'
  | 'signalements.voir'
  | 'signalements.traiter'
  // Suivi (les 3 rôles — étape 14)
  | 'tableau_de_bord.voir'
  | 'stats.voir'
  | 'stats.exporter'
  // Réglages et tarifs
  | 'reglages.voir'                         // les 3 rôles
  | 'reglages.modifier';                    // super_admin


/* ---------------------------------------------------------------------------
   Connexion et compte connecté
   --------------------------------------------------------------------------- */

/** POST /api/admin/auth/login (body). */
export interface DemandeConnexionAdmin {
  email: string;
  motDePasse: string;
}

/** POST /api/admin/auth/login (réponse). Le jeton va dans "Authorization: Bearer ...". */
export interface ConnexionAdmin {
  accessToken: string;
  expiresInSeconds: number;               // 8 h
  administrateur: Administrateur;
  permissions: ActionAdmin[];
}

/** GET /api/admin/auth/me. */
export interface CompteAdminConnecte {
  administrateur: Administrateur;
  permissions: ActionAdmin[];
}


/* ---------------------------------------------------------------------------
   Comptes du back-office (super_admin)
   --------------------------------------------------------------------------- */

/** POST /api/admin/accounts (body). Un super_admin ne se crée jamais par l'API. */
export interface DemandeCreationCompte {
  nomComplet: string;
  email: string;
  role: Exclude<RoleAdmin, 'super_admin'>;
}

/** PATCH /api/admin/accounts/:id/active (body). */
export interface DemandeActivationCompte {
  actif: boolean;
}

/** POST /api/admin/accounts et POST /api/admin/accounts/:id/reset-password (réponse).
    Le mot de passe temporaire n'est montré qu'une fois : le super admin le donne à la personne. */
export interface CompteAvecMotDePasse {
  administrateur: Administrateur;
  motDePasseTemporaire: string;
}


/* ---------------------------------------------------------------------------
   Dossiers chauffeurs et véhicules (super_admin, admin)
   --------------------------------------------------------------------------- */

/** GET /api/admin/drivers/applications : un dossier en attente de décision. */
export interface DossierChauffeur {
  utilisateurId: number;
  nom: string | null;
  prenom: string | null;
  telephone: string;
  photoUrl: string | null;
  numeroPermis: string | null;            // à comparer avec la photo du permis avant de valider
  statutChauffeur: StatutChauffeur;
  documents: DocumentChauffeur[];         // dernier recto, verso, selfie ; liens valables 10 min
  dateCreation: string;
}

/** GET /api/admin/vehicles/pending : un véhicule en attente de décision. */
export interface VehiculeEnAttente {
  vehicule: Vehicule;
  proprietaire: { utilisateurId: number; nom: string | null; prenom: string | null };
}

/** POST /api/admin/vehicles/:id/reject (body). */
export interface DemandeRefus {
  motif: string;                          // montré au chauffeur
}

/** POST /api/admin/drivers/:id/reject (body). */
export interface DemandeRefusDossier extends DemandeRefus {
  documents?: TypeDocument[];             // documents refusés ; absent = tous
}


/* ---------------------------------------------------------------------------
   Statistiques (les 3 rôles — étape 14, À VENIR)
   Uniquement des chiffres agrégés : jamais de nom, téléphone, plaque ni id d'utilisateur.
   Un groupe de moins de 5 personnes est masqué ou regroupé dans « Autres ».
   --------------------------------------------------------------------------- */

/** Une valeur, comparée à la période précédente de même durée. */
export interface Indicateur {
  valeur: number;
  periodePrecedente: number | null;
  evolution: number | null;               // ex. 0.12 = +12 % ; null si rien à comparer
}

/** GET /api/admin/stats/overview?du=2026-11-01&au=2026-11-30 */
export interface StatistiquesPeriode {
  du: string;
  au: string;
  croissance: {
    inscrits: Indicateur;                 // total à la fin de la période
    nouveauxInscrits: Indicateur;
    chauffeursValides: Indicateur;
    dossiersEnAttente: number;
    utilisateursActifs: Indicateur;       // au moins une course dans la période
  };
  activite: {
    coursesTerminees: Indicateur;
    placesReservees: Indicateur;
    tauxRemplissage: Indicateur;          // places réservées / places proposées
    trajetsALAvance: Indicateur;
    trajetsImmediats: Indicateur;
    coursesVoiture: Indicateur;
    coursesMoto: Indicateur;
  };
  argent: {
    montantTotal: Indicateur;             // payé aux chauffeurs par les passagers
    prixMoyenCourse: Indicateur;
    distanceMoyenneMetres: Indicateur;
  };
  qualite: {
    tauxAcceptation: Indicateur;
    tempsReponseMoyenSecondes: Indicateur;
    tauxAnnulation: Indicateur;
    tauxAbsence: Indicateur;
    noteMoyenneChauffeurs: Indicateur;
    noteMoyennePassagers: Indicateur;
  };
  securite: {
    signalements: Indicateur;
    alertesSos: Indicateur;
    delaiTraitementMoyenMinutes: Indicateur;
  };
}

export type Granularite = 'jour' | 'semaine' | 'mois';

export type MetriqueSuivie =
  | 'nouveaux_inscrits'
  | 'utilisateurs_actifs'
  | 'courses_terminees'
  | 'places_reservees'
  | 'montant_total';

/** GET /api/admin/stats/timeseries?metrique=courses_terminees&granularite=jour&du=...&au=... */
export interface SerieTemporelle {
  metrique: MetriqueSuivie;
  granularite: Granularite;
  points: { date: string; valeur: number }[];
}

/** GET /api/admin/stats/top-routes?du=...&au=... : les 10 trajets quartier -> quartier les plus faits. */
export interface TrajetPopulaire {
  depart: string;                         // nom du quartier, ou "Autres"
  arrivee: string;
  courses: number;
}
