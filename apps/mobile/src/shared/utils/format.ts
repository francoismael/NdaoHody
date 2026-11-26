/** Display formats in French (Madagascar). They know nothing about carpooling. */

const pad = (value: number): string => String(value).padStart(2, '0');

/** 850 -> "850 m" · 12 400 -> "12,4 km". */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  const km = metres / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;
}

/** 1 500 -> "25 min" · 4 200 -> "1 h 10". At least 1 min. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)}`;
}

/** Minutes after midnight -> "07:30". */
export const formatClockMinutes = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** "07:30" for a date. */
export const formatTime = (date: Date): string => formatClockMinutes(date.getHours() * 60 + date.getMinutes());

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "aujourd’hui", "demain" or "jeudi 26 novembre", relative to `now` (the app clock). */
export function formatDay(date: Date, now: Date): string {
  if (sameDay(date, now)) return 'aujourd’hui';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'demain';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "jeu. 26 nov. 2026": a past date shown small (reviews). */
export const formatShortDate = (date: Date): string =>
  date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** "demain à 07:30". */
export const formatDayTime = (date: Date, now: Date): string => `${formatDay(date, now)} à ${formatTime(date)}`;

/** 3000 -> "3 000 Ar" (thin space, as in French). */
export const formatAriary = (amount: number): string => `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Ar`;
