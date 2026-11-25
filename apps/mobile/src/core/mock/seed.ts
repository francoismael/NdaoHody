import type {
  Avis,
  Conversation,
  Message,
  Reservation,
  StatutReservation,
  StatutTrajet,
  StatutChauffeur,
  Sexe,
  Trajet,
  TypeTrajet,
  Utilisateur,
  Vehicule,
} from '@contract';

import { indexAtFraction } from '@/shared/map';

import { refreshDerived } from './derived';
import { ITINERARIES, type ItineraryKey } from './itineraries';
import { notify } from './notify';
import { PLACES, type PlaceKey } from './places';
import { seatPrice, totalPrice } from './pricing';
import { getRoute } from './routeCache';
import { DAY_MINUTES, iso, isoIn, minutesUntilLocalTime } from './time';
import { nearestIndex, segmentMetres, segmentSeconds, toLieu } from './tripGeo';
import { DB_VERSION, type MockDb, type Sequence } from './types';

/** The account the demo phone signs in with (passenger, can become a driver). */
export const DEMO_USER_ID = 1;
/** The simulated SMS code. */
export const DEMO_OTP_CODE = '123456';

const USERS = {
  hery: 1,
  voahirana: 2,
  tiana: 3,
  rado: 4,
  fara: 5,
  njaka: 6,
} as const;

const VEHICLES = { tiana: 1, rado: 2, fara: 3, njaka: 4 } as const;

function emptyDb(now: Date): MockDb {
  return {
    version: DB_VERSION,
    seededAt: iso(now),
    utilisateurs: [],
    documents: [],
    vehicules: [],
    trajets: [],
    positions: [],
    reservations: [],
    conversations: [],
    avis: [],
    notifications: [],
    alertesSos: [],
    liensSuivi: [],
    motifsRefus: {},
    sequences: {
      utilisateur: 1,
      document: 1,
      vehicule: 1,
      trajet: 1,
      reservation: 1,
      conversation: 1,
      message: 1,
      avis: 1,
      notification: 1,
      sos: 1,
      lienSuivi: 1,
    },
  };
}

function addUser(
  db: MockDb,
  now: Date,
  id: number,
  telephone: string,
  prenom: string,
  nom: string,
  sexe: Sexe | null,
  createdDaysAgo: number,
  statutChauffeur: StatutChauffeur,
): void {
  db.utilisateurs.push({
    id,
    telephone,
    nom,
    prenom,
    sexe,
    photoUrl: null,
    modeActuel: statutChauffeur === 'valide' ? 'chauffeur' : 'passager',
    statutChauffeur,
    statut: 'actif',
    badge: 'non_verifie', // computed by refreshDerived
    noteMoyenne: null,
    nombreNotes: 0,
    coursesPassager: 0,
    coursesChauffeur: 0,
    absences: 0,
    telephoneVerifie: true,
    dateCreation: isoIn(now, -createdDaysAgo * DAY_MINUTES),
  } satisfies Utilisateur);
}

function addDriverKit(db: MockDb, now: Date, vehicle: Omit<Vehicule, 'parDefaut' | 'statut' | 'motifRefus' | 'photoUrl'>): void {
  (['permis_recto', 'permis_verso', 'selfie'] as const).forEach((type) => {
    const id = db.documents.length + 1;
    db.documents.push({
      id,
      utilisateurId: vehicle.utilisateurId,
      type,
      fichierUrl: `mock://documents/${id}`,
      statut: 'valide',
      motifRefus: null,
      dateEnvoi: isoIn(now, -30 * DAY_MINUTES),
    });
  });
  // photoUrl: no picture in the demo; screens show the vehicle icon instead.
  db.vehicules.push({ ...vehicle, photoUrl: '', parDefaut: true, statut: 'valide', motifRefus: null });
}

interface TripInput {
  chauffeurId: number;
  vehiculeId: number;
  itinerary: ItineraryKey;
  type: TypeTrajet;
  statut: StatutTrajet;
  /** Departure, in minutes from now (negative = already left). */
  departMinutes: number;
  placesTotal: number;
  reserveFemmes?: boolean;
}

function addTrip(db: MockDb, now: Date, input: TripInput): Trajet {
  const route = getRoute(input.itinerary);
  const stops = ITINERARIES[input.itinerary];
  const trajet: Trajet = {
    id: db.trajets.length + 1,
    chauffeurId: input.chauffeurId,
    vehiculeId: input.vehiculeId,
    type: input.type,
    statut: input.statut,
    depart: { ...PLACES[stops[0]] },
    arrivee: { ...PLACES[stops[stops.length - 1]] },
    chemin: route.chemin,
    distanceMetres: route.distanceMetres,
    dureeSecondes: route.dureeSecondes,
    dateDepart: isoIn(now, input.departMinutes),
    placesTotal: input.placesTotal,
    placesLibres: input.placesTotal, // computed by refreshDerived
    prixParPlace: seatPrice(route.distanceMetres),
    dateAnnulation: null,
    dateFin: input.statut === 'termine' ? isoIn(now, input.departMinutes + Math.round(route.dureeSecondes / 60)) : null,
    reserveFemmes: input.reserveFemmes ?? false,
  };
  db.trajets.push(trajet);
  return trajet;
}

interface ReservationInput {
  trajet: Trajet;
  passagerId: number;
  places: number;
  from: PlaceKey;
  to: PlaceKey;
  statut: StatutReservation;
  /** When the request was sent, in minutes from now. */
  requestedMinutes: number;
}

function addReservation(db: MockDb, now: Date, input: ReservationInput): Reservation {
  const { trajet } = input;
  const pickup = nearestIndex(trajet, PLACES[input.from]).index;
  const drop = nearestIndex(trajet, PLACES[input.to]).index;
  const answered = input.statut !== 'en_attente';
  const done = input.statut === 'terminee';
  const departMinutes = (new Date(trajet.dateDepart).getTime() - now.getTime()) / 60_000;
  const pickupMinutes = departMinutes + segmentSeconds(trajet, 0, pickup) / 60;
  const rideMinutes = segmentSeconds(trajet, pickup, drop) / 60;
  const at = (minutes: number) => isoIn(now, Math.round(minutes));

  const reservation: Reservation = {
    id: db.reservations.length + 1,
    trajetId: trajet.id,
    passagerId: input.passagerId,
    places: input.places,
    prixTotal: totalPrice(segmentMetres(trajet, pickup, drop), input.places),
    priseEnCharge: toLieu(trajet.chemin[pickup], PLACES[input.from].libelle),
    depose: toLieu(trajet.chemin[drop], PLACES[input.to].libelle),
    statut: input.statut,
    relanceDe: null,
    dateDemande: at(input.requestedMinutes),
    dateExpiration: at(input.requestedMinutes + 3),
    dateReponse: answered ? at(input.requestedMinutes + (input.statut === 'expiree' ? 3 : 1)) : null,
    dateSurPlace: done ? at(pickupMinutes - 2) : null,
    finAttente: null,
    prolongations: 0,
    dateDebutCourse: done ? at(pickupMinutes) : null,
    dateFinCourse: done ? at(pickupMinutes + rideMinutes) : null,
    dateAnnulation: input.statut === 'annulee_passager' ? at(input.requestedMinutes + 1) : null,
  };
  db.reservations.push(reservation);
  return reservation;
}

const COMMENTS = [
  'Très ponctuel, conduite calme.',
  'Voiture propre, je recommande.',
  null,
  'Sympa et prudent dans les embouteillages.',
  'Un peu en retard mais prévenu à l’avance.',
  null,
];

/** A finished ride in the past: trip + reservation + (optional) review. */
function addPastRide(
  db: MockDb,
  now: Date,
  driver: { chauffeurId: number; vehiculeId: number; itinerary: ItineraryKey },
  passagerId: number,
  daysAgo: number,
  from: PlaceKey,
  to: PlaceKey,
  note: number | null,
): Reservation {
  const trajet = addTrip(db, now, {
    ...driver,
    type: daysAgo % 2 === 0 ? 'a_l_avance' : 'immediat',
    statut: 'termine',
    departMinutes: minutesUntilLocalTime(now, -daysAgo, 7, 30),
    placesTotal: 3,
  });
  const requestedMinutes = (new Date(trajet.dateDepart).getTime() - now.getTime()) / 60_000 - 20;
  const reservation = addReservation(db, now, { trajet, passagerId, places: 1, from, to, statut: 'terminee', requestedMinutes });
  if (note !== null && reservation.dateFinCourse) {
    db.avis.push({
      id: db.avis.length + 1,
      reservationId: reservation.id,
      auteurId: passagerId,
      cibleId: trajet.chauffeurId,
      note,
      commentaire: COMMENTS[db.avis.length % COMMENTS.length],
      dateAvis: iso(new Date(new Date(reservation.dateFinCourse).getTime() + 30 * 60_000)),
    } satisfies Avis);
  }
  return reservation;
}

function addConversation(db: MockDb, now: Date, reservation: Reservation, lines: Array<[number, number, string, boolean]>): void {
  const id = db.conversations.length + 1;
  const messages: Message[] = lines.map(([auteurId, minutes, contenu, lu], i) => ({
    id: db.conversations.reduce((n, c) => n + c.messages.length, 0) + i + 1,
    conversationId: id,
    auteurId,
    type: 'texte',
    contenu,
    audioUrl: null,
    audioSecondes: null,
    lu,
    dateEnvoi: isoIn(now, minutes),
  }));
  db.conversations.push({ id, reservationId: reservation.id, messages } satisfies Conversation);
}

/** Next free id of each table, after the seed wrote fixed ids. */
function syncSequences(db: MockDb): void {
  const maxId = (ids: number[]) => ids.reduce((m, id) => Math.max(m, id), 0) + 1;
  const sequences: Record<Sequence, number> = {
    utilisateur: maxId(db.utilisateurs.map((x) => x.id)),
    document: maxId(db.documents.map((x) => x.id)),
    vehicule: maxId(db.vehicules.map((x) => x.id)),
    trajet: maxId(db.trajets.map((x) => x.id)),
    reservation: maxId(db.reservations.map((x) => x.id)),
    conversation: maxId(db.conversations.map((x) => x.id)),
    message: maxId(db.conversations.flatMap((c) => c.messages.map((m) => m.id))),
    avis: maxId(db.avis.map((x) => x.id)),
    notification: db.sequences.notification,
    sos: maxId(db.alertesSos.map((x) => x.id)),
    lienSuivi: maxId(db.liensSuivi.map((x) => x.id)),
  };
  db.sequences = sequences;
}

/**
 * Demo dataset, built from the demo script. Every date is relative to `now`:
 * reset the demo just before presenting so nothing is in the past.
 *
 * Script: Hery (demo phone, passenger at Analakely) sees 3 drivers passing by:
 * Tiana (many reviews, ~4.8), Rado (new account, moto, no review),
 * Fara (women-only trip, hidden from Hery). Njaka has accepted Hery for tomorrow.
 */
export function createSeed(now: Date): MockDb {
  const db = emptyDb(now);

  addUser(db, now, USERS.hery, '+261340000001', 'Hery', 'Rakoto', null, 120, 'aucun');
  // Passengers are not asked their sex; Voahirana gave it to see women-only trips.
  addUser(db, now, USERS.voahirana, '+261340000002', 'Voahirana', 'Randria', 'femme', 60, 'aucun');
  addUser(db, now, USERS.tiana, '+261340000003', 'Tiana', 'Rasolofo', 'homme', 400, 'valide');
  addUser(db, now, USERS.rado, '+261340000004', 'Rado', 'Andrianaivo', 'homme', 6, 'valide');
  addUser(db, now, USERS.fara, '+261340000005', 'Fara', 'Razafy', 'femme', 200, 'valide');
  addUser(db, now, USERS.njaka, '+261340000006', 'Njaka', 'Rabe', 'homme', 300, 'valide');

  addDriverKit(db, now, { id: VEHICLES.tiana, utilisateurId: USERS.tiana, type: 'voiture', marque: 'Toyota', modele: 'Corolla', couleur: 'Gris', immatriculation: '2345 TBA', places: 4 });
  addDriverKit(db, now, { id: VEHICLES.rado, utilisateurId: USERS.rado, type: 'moto', marque: 'Yamaha', modele: 'YBR 125', couleur: 'Noir', immatriculation: '5678 TBB', places: 1 });
  addDriverKit(db, now, { id: VEHICLES.fara, utilisateurId: USERS.fara, type: 'voiture', marque: 'Peugeot', modele: '206', couleur: 'Rouge', immatriculation: '9012 TBC', places: 3 });
  addDriverKit(db, now, { id: VEHICLES.njaka, utilisateurId: USERS.njaka, type: 'voiture', marque: 'Renault', modele: 'Clio', couleur: 'Blanc', immatriculation: '3456 TBD', places: 4 });

  const tiana = { chauffeurId: USERS.tiana, vehiculeId: VEHICLES.tiana, itinerary: 'tanjombatoIvato' } as const;
  const njaka = { chauffeurId: USERS.njaka, vehiculeId: VEHICLES.njaka, itinerary: 'ivatoTanjombato' } as const;
  const fara = { chauffeurId: USERS.fara, vehiculeId: VEHICLES.fara, itinerary: 'itaosyAnkatso' } as const;

  // History. Tiana: many rides and reviews. The most recent one with Hery is not rated yet.
  const tianaNotes = [5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 5, 4, 5];
  const lastRideWithTiana = addPastRide(db, now, tiana, USERS.hery, 1, 'analakely', 'ankorondrano', null);
  tianaNotes.forEach((note, i) =>
    addPastRide(db, now, tiana, i % 2 === 0 ? USERS.voahirana : USERS.hery, 2 + i * 3, 'analakely', i % 3 === 0 ? 'ivato' : 'ankorondrano', note),
  );
  [4, 5, 4, 4, 5].forEach((note, i) => addPastRide(db, now, njaka, USERS.hery, 3 + i * 5, 'analakely', 'tanjombato', note));
  [5, 5, 4].forEach((note, i) => addPastRide(db, now, fara, USERS.voahirana, 2 + i * 6, 'soixanteSeptHa', 'ankatso', note));

  // Hery's other history: one request with no answer, one he cancelled.
  const oldTrip = addTrip(db, now, { ...njaka, type: 'a_l_avance', statut: 'termine', departMinutes: minutesUntilLocalTime(now, -2, 17, 0), placesTotal: 3 });
  addReservation(db, now, { trajet: oldTrip, passagerId: USERS.hery, places: 1, from: 'analakely', to: 'tanjombato', statut: 'expiree', requestedMinutes: -2 * DAY_MINUTES - 60 });
  const otherTrip = addTrip(db, now, { ...tiana, type: 'immediat', statut: 'termine', departMinutes: -4 * DAY_MINUTES, placesTotal: 3 });
  addReservation(db, now, { trajet: otherTrip, passagerId: USERS.hery, places: 2, from: 'analakely', to: 'ivato', statut: 'annulee_passager', requestedMinutes: -4 * DAY_MINUTES - 10 });

  // Now: three drivers on the road, all passing through Analakely.
  const t1 = addTrip(db, now, { ...tiana, type: 'immediat', statut: 'en_route', departMinutes: -10, placesTotal: 3 });
  const t2 = addTrip(db, now, { chauffeurId: USERS.rado, vehiculeId: VEHICLES.rado, itinerary: 'ampefilohaAndravoahangy', type: 'immediat', statut: 'en_route', departMinutes: -4, placesTotal: 1 });
  const t3 = addTrip(db, now, { ...fara, type: 'immediat', statut: 'en_route', departMinutes: -8, placesTotal: 3, reserveFemmes: true });
  // Voahirana already rides with Tiana: second passenger for the multi-passenger demo.
  const withTiana = addReservation(db, now, { trajet: t1, passagerId: USERS.voahirana, places: 1, from: 'analakely', to: 'ankorondrano', statut: 'acceptee', requestedMinutes: -6 });

  // Tomorrow: planned trips.
  const t4 = addTrip(db, now, { ...njaka, type: 'a_l_avance', statut: 'publie', departMinutes: minutesUntilLocalTime(now, 1, 7, 30), placesTotal: 4 });
  addTrip(db, now, { ...tiana, type: 'a_l_avance', statut: 'publie', departMinutes: minutesUntilLocalTime(now, 1, 17, 30), placesTotal: 3 });
  const withNjaka = addReservation(db, now, { trajet: t4, passagerId: USERS.hery, places: 1, from: 'analakely', to: 'tanjombato', statut: 'acceptee', requestedMinutes: -120 });

  // Live positions: each driver is before Analakely, so he can still pick Hery up.
  const live: Array<[Trajet, number]> = [
    [t1, 0.15],
    [t2, 0.1],
    [t3, 0.2],
  ];
  live.forEach(([trajet, fraction]) => {
    const [longitude, latitude] = trajet.chemin[indexAtFraction(trajet.chemin, fraction)];
    db.positions.push({ chauffeurId: trajet.chauffeurId, trajetId: trajet.id, enLigne: true, latitude, longitude, dateMiseAJour: iso(now) });
  });
  db.positions.push({ chauffeurId: USERS.njaka, trajetId: null, enLigne: false, latitude: PLACES.ivato.latitude, longitude: PLACES.ivato.longitude, dateMiseAJour: isoIn(now, -90) });

  addConversation(db, now, withNjaka, [
    [USERS.njaka, -110, 'Bonjour Hery ! Je passe à Analakely vers 7 h 50 demain.', true],
    [USERS.hery, -100, 'Merci ! Je serai devant le marché, côté escaliers.', true],
    [USERS.njaka, -95, 'Parfait, c’est noté comme point de rendez-vous.', false],
  ]);
  addConversation(db, now, withTiana, [[USERS.tiana, -5, 'J’arrive dans 10 minutes à Analakely.', false]]);

  const accepted = notify(db, now, USERS.hery, 'demande_acceptee', 'Réservation acceptée', 'Njaka a accepté ta demande pour demain à 7 h 30.', { reservationId: withNjaka.id, trajetId: t4.id });
  accepted.lu = true;
  accepted.dateCreation = isoIn(now, -118);
  notify(db, now, USERS.hery, 'nouveau_message', 'Nouveau message de Njaka', 'Parfait, c’est noté comme point de rendez-vous.', { reservationId: withNjaka.id }).dateCreation = isoIn(now, -95);
  notify(db, now, USERS.hery, 'demande_avis', 'Note ton trajet avec Tiana', 'Comment s’est passé ton trajet d’hier ?', { reservationId: lastRideWithTiana.id }).dateCreation = isoIn(now, -DAY_MINUTES + 60);

  syncSequences(db);
  refreshDerived(db, now);
  return db;
}
