/* =============================================================================
   NDAOHODY — Data objects (objets échangés entre l'API et le front)
   Chaque objet correspond à une table de donnees.sql (même nom, en camelCase).
   Dates : chaînes ISO 8601 avec fuseau, ex. "2026-11-24T10:00:00+03:00".
   Montants : entiers en Ariary.  Positions : latitude / longitude en degrés.
   ============================================================================= */


/* ---------------------------------------------------------------------------
   Valeurs possibles
   --------------------------------------------------------------------------- */
export type Sexe = 'homme' | 'femme';
export type Mode = 'passager' | 'chauffeur';
export type StatutChauffeur = 'aucun' | 'en_attente' | 'valide' | 'refuse' | 'suspendu';
export type StatutCompte = 'actif' | 'suspendu' | 'supprime';
export type Badge = 'nouveau' | 'non_verifie' | 'verifie' | 'top';
export type RoleAdmin = 'super_admin' | 'admin' | 'investisseur';
export type TypeDocument = 'permis_recto' | 'permis_verso' | 'selfie';
export type StatutValidation = 'en_attente' | 'valide' | 'refuse';
export type TypeVehicule = 'moto' | 'voiture';
export type StatutVehicule = 'en_attente' | 'valide' | 'refuse' | 'archive';
export type TypeTrajet = 'a_l_avance' | 'immediat';
export type StatutTrajet = 'publie' | 'en_route' | 'en_cours' | 'termine' | 'annule';
export type StatutReservation =
  | 'en_attente'          // demande envoyée, le chauffeur a 3 min pour répondre
  | 'acceptee'            // le chauffeur vient chercher le passager
  | 'refusee'
  | 'expiree'             // pas de réponse en 3 min : le passager peut relancer ou chercher un autre
  | 'chauffeur_sur_place' // compte à rebours de 15 min
  | 'en_course'           // passager à bord
  | 'terminee'
  | 'absent'
  | 'annulee_passager'
  | 'annulee_chauffeur';
export type TypeMessage = 'texte' | 'vocal';
export type MotifSignalement = 'comportement' | 'securite' | 'arnaque' | 'absent' | 'vehicule_different' | 'autre';
export type StatutSignalement = 'nouveau' | 'en_cours' | 'traite' | 'rejete';
export type StatutSos = 'ouvert' | 'pris_en_charge' | 'clos';


/* ---------------------------------------------------------------------------
   Objets de base
   --------------------------------------------------------------------------- */

/** Un point sur la carte. */
export interface Position {
  latitude: number;
  longitude: number;
}

/** Un lieu avec son nom, ex. « Tanjombato, arrêt Jumbo ». */
export interface Lieu extends Position {
  libelle: string;
}

/** Chemin du trajet : liste de [longitude, latitude] (GeoJSON, utilisable tel quel par Mapbox). */
export type Chemin = [number, number][];


/* ---------------------------------------------------------------------------
   Utilisateur de l'application (table utilisateur)
   --------------------------------------------------------------------------- */
export interface Utilisateur {
  id: number;
  telephone: string;              // "+261340000001"
  nom: string | null;
  prenom: string | null;          // null seulement pour un ancien compte à compléter
  sexe: Sexe | null;
  photoUrl: string | null;
  modeActuel: Mode;
  statutChauffeur: StatutChauffeur;
  statut: StatutCompte;
  badge: Badge;
  noteMoyenne: number | null;     // null = jamais noté
  nombreNotes: number;
  coursesPassager: number;
  coursesChauffeur: number;
  absences: number;
  telephoneVerifie: boolean;
  dateCreation: string;
}

/** Ce que les autres voient d'un utilisateur (jamais le téléphone avant acceptation). */
export interface ProfilPublic {
  id: number;
  prenom: string;
  photoUrl: string | null;
  badge: Badge;
  noteMoyenne: number | null;
  nombreNotes: number;
}


/* ---------------------------------------------------------------------------
   Chauffeur : documents et véhicules
   --------------------------------------------------------------------------- */
export interface DocumentChauffeur {
  id: number;
  utilisateurId: number;
  type: TypeDocument;
  fichierUrl: string;             // lien privé, durée limitée
  statut: StatutValidation;
  motifRefus: string | null;
  dateEnvoi: string;
}

export interface Vehicule {
  id: number;
  utilisateurId: number;
  type: TypeVehicule;
  marque: string | null;
  modele: string | null;
  couleur: string;
  immatriculation: string;        // "1234 TBA"
  places: number;                 // moto = 1
  photoUrl: string;
  parDefaut: boolean;
  statut: StatutVehicule;
  motifRefus: string | null;
}


/* ---------------------------------------------------------------------------
   Lieux et prix
   --------------------------------------------------------------------------- */
export interface Quartier extends Position {
  id: number;
  nom: string;
}

/** Tarif par type de véhicule (table tarif), modifiable par le super admin.
    Prix d'une place = max(prixMinimum, km du passager x prixParKm), arrondi à la centaine supérieure.
    Voiture : 300 Ar/km, au moins 3 000 Ar (12 km -> 3 600 Ar).
    Moto : 500 Ar/km, au moins 5 000 Ar (13 km -> 6 500 Ar).
    Le prix est toujours calculé par le serveur ; l'app l'affiche seulement. */
export interface Tarif {
  typeVehicule: TypeVehicule;
  prixMinimum: number;
  prixParKm: number;
  arrondi: number;                // 100 : arrondi à la centaine supérieure
}


/* ---------------------------------------------------------------------------
   Trajet (table trajet)
   --------------------------------------------------------------------------- */
export interface Trajet {
  id: number;
  chauffeurId: number;
  vehiculeId: number;
  type: TypeTrajet;
  statut: StatutTrajet;
  depart: Lieu;
  arrivee: Lieu;
  chemin: Chemin;
  distanceMetres: number;
  dureeSecondes: number;
  dateDepart: string;
  placesTotal: number;
  placesLibres: number;           // un passager peut toutes les réserver
  dateAnnulation: string | null;
  dateFin: string | null;
  /** true : visible seulement par les femmes (option choisie par une conductrice).
      Une femme, passagère ou conductrice, garde accès à tous les trajets normaux
      avec des hommes : c'est son choix, jamais une obligation. */
  reserveFemmes: boolean;
}

/** Dernière position du chauffeur (envoyée en direct toutes les 5 s). */
export interface PositionChauffeur extends Position {
  chauffeurId: number;
  trajetId: number | null;
  enLigne: boolean;
  dateMiseAJour: string;
}


/* ---------------------------------------------------------------------------
   Recherche du passager
   --------------------------------------------------------------------------- */
export interface DemandeRecherche {
  depart: Lieu;                   // position actuelle ou point choisi
  destination: Lieu;
  places: number;
  quand: string;                  // "maintenant" ou une date ISO pour plus tard
  femmesSeulement?: boolean;      // passagère : n'afficher que les trajets réservés aux femmes (facultatif)
}

/** Un chauffeur qui passe sur le chemin du passager.
    Ordre : chauffeurs notés (meilleure note d'abord), puis non notés. */
export interface ResultatRecherche {
  trajet: Trajet;
  chauffeur: ProfilPublic;
  vehicule: Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation'>;
  priseEnCharge: Lieu;            // point de la route où le chauffeur s'arrête
  depose: Lieu;
  arriveeDansMinutes: number | null;  // trajet parti : temps pour arriver au passager
  heurePassage: string | null;        // trajet à l'avance : heure estimée au point du passager
  distanceMetres: number;         // distance du passager : prise en charge -> dépose
  prixParPlace: number;           // calculé par le serveur avec le tarif du véhicule
  prixTotal: number;              // prixParPlace x places demandées
}


/* ---------------------------------------------------------------------------
   Réservation (table reservation)
   --------------------------------------------------------------------------- */
export interface Reservation {
  id: number;
  trajetId: number;
  passagerId: number;
  places: number;                 // de 1 à toutes les places libres du trajet
  distanceMetres: number;         // distance du passager : prise en charge -> dépose
  prixParPlace: number;           // figé au moment de la demande
  prixTotal: number;              // prixParPlace x places
  priseEnCharge: Lieu;
  depose: Lieu;
  statut: StatutReservation;
  relanceDe: number | null;       // id de la demande expirée relancée
  dateDemande: string;
  dateExpiration: string;         // dateDemande + 3 min (compte à rebours du chauffeur)
  dateReponse: string | null;
  dateSurPlace: string | null;    // « Je suis déjà sur place »
  finAttente: string | null;      // fin du compte à rebours de 15 min en cours
  prolongations: number;
  dateDebutCourse: string | null;
  dateFinCourse: string | null;
  dateAnnulation: string | null;
}

/** Écran de suivi pendant l'approche (passager et chauffeur). */
export interface SuiviReservation {
  reservation: Reservation;
  trajet: Trajet;
  chauffeur: ProfilPublic & { telephone: string };   // téléphone visible après acceptation
  passager: ProfilPublic & { telephone: string };
  vehicule: Vehicule;
  positionChauffeur: PositionChauffeur;
  cheminVersPassager: Chemin;     // chemin du chauffeur jusqu'au point de prise en charge
  arriveeDansMinutes: number;
  distanceMetres: number;         // < 500 -> bouton « Je suis déjà sur place »
}


/* ---------------------------------------------------------------------------
   Lien de suivi pour un proche (table lien_suivi)
   --------------------------------------------------------------------------- */
export interface LienSuivi {
  id: number;
  reservationId: number;
  jeton: string;
  url: string;                    // ex. "https://ndaohody.mg/suivi/<jeton>", à partager par WhatsApp / SMS
  consultations: number;
  dateCreation: string;
  dateExpiration: string | null;  // 24 h après la fin de la course
}

/** Ce que voit le proche, sans compte. Jamais de numéro de téléphone. */
export interface SuiviPublic {
  etat: 'en_attente' | 'chauffeur_en_approche' | 'chauffeur_sur_place' | 'en_course' | 'terminee' | 'annulee' | 'expire';
  passagerPrenom: string;
  chauffeurPrenom: string;
  chauffeurPhotoUrl: string | null;
  vehicule: Pick<Vehicule, 'type' | 'marque' | 'modele' | 'couleur' | 'immatriculation'>;
  priseEnCharge: Lieu;
  depose: Lieu;
  chemin: Chemin;
  positionChauffeur: Position | null;   // seulement pendant l'approche et la course
  dateMiseAJour: string;
}


/* ---------------------------------------------------------------------------
   Messagerie
   --------------------------------------------------------------------------- */
export interface Conversation {
  id: number;
  reservationId: number;
  messages: Message[];
}

export interface Message {
  id: number;
  conversationId: number;
  auteurId: number;
  type: TypeMessage;
  contenu: string | null;         // texte
  audioUrl: string | null;        // vocal
  audioSecondes: number | null;
  lu: boolean;
  dateEnvoi: string;              // supprimé 24 h après
}


/* ---------------------------------------------------------------------------
   Avis, signalements, SOS, blocages
   --------------------------------------------------------------------------- */
export interface Avis {
  id: number;
  reservationId: number;
  auteurId: number;
  cibleId: number;
  note: number;                   // 1 à 5
  commentaire: string | null;
  dateAvis: string;
}

export interface Signalement {
  id: number;
  auteurId: number;
  cibleId: number;
  reservationId: number | null;
  motif: MotifSignalement;
  description: string | null;
  statut: StatutSignalement;
  traitePar: number | null;
  dateSignalement: string;
}

export interface AlerteSos {
  id: number;
  utilisateurId: number;
  reservationId: number | null;
  latitude: number | null;
  longitude: number | null;
  statut: StatutSos;
  traitePar: number | null;
  note: string | null;
  dateAlerte: string;
}

export interface Blocage {
  id: number;
  utilisateurId: number;
  bloqueId: number;
}


/* ---------------------------------------------------------------------------
   Notification push (MongoDB, pas dans donnees.sql)
   --------------------------------------------------------------------------- */
export type TypeNotification =
  | 'nouvelle_demande' | 'demande_acceptee' | 'demande_refusee' | 'demande_expiree'
  | 'chauffeur_sur_place' | 'attente_terminee' | 'attente_prolongee'
  | 'course_demarree' | 'course_terminee_noter'
  | 'reservation_annulee' | 'trajet_annule'
  | 'kyc_valide' | 'kyc_refuse' | 'badge_obtenu'
  | 'rappel_depart' | 'nouveau_message' | 'demande_avis' | 'trajet_modifie';

/** Types que l'utilisateur peut couper. Les autres (demande, acceptation, sur place…) restent toujours actifs. */
export type TypeNotificationReglable = 'rappel_depart' | 'nouveau_message' | 'demande_avis' | 'badge_obtenu' | 'trajet_modifie';

/** Préférence de notification (table preference_notification). */
export interface PreferenceNotification {
  type: TypeNotificationReglable;
  active: boolean;
}

export interface Notification {
  id: string;                     // identifiant MongoDB
  utilisateurId: number;
  type: TypeNotification;
  titre: string;
  message: string;
  donnees: { reservationId?: number; trajetId?: number };   // écran à ouvrir
  lu: boolean;
  dateCreation: string;
}


/* ---------------------------------------------------------------------------
   Back-office
   --------------------------------------------------------------------------- */
export interface Administrateur {
  id: number;
  nomComplet: string;
  email: string;
  role: RoleAdmin;
  actif: boolean;
  creePar: number | null;
  derniereConnexion: string | null;
  dateCreation: string;
}

export interface JournalAdmin {
  id: number;
  administrateurId: number;
  action: string;                 // ex. "chauffeur.valider"
  cibleType: string | null;
  cibleId: number | null;
  details: string | null;
  dateAction: string;
}

export interface Parametre {
  cle: string;                    // ex. "delai_reponse_secondes"
  valeur: string;
  description: string | null;
}

/** Tableau de bord (les 3 rôles ; anonymisé pour l'investisseur). */
export interface TableauDeBord {
  utilisateurs: number;
  chauffeursValides: number;
  chauffeursEnLigne: number;
  trajetsEnCours: number;
  coursesAujourdhui: number;
  coursesSemaine: number;
  tauxAcceptation: number;        // 0 à 1
  noteMoyenne: number | null;
  verificationsEnAttente: number;
  signalementsNouveaux: number;
  sosOuverts: number;
}
