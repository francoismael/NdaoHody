/**
 * Safety rules, shared by the screens (and tomorrow the simulated server). No imports: core may read this file.
 */

/** An emergency number of Madagascar, called with the phone app. */
export interface EmergencyNumber {
  numero: string;
  libelle: string;
}

/**
 * Same list as the PWA (Components/Securite.jsx). GAP #17: the back has no list yet (the PWA had it from
 * its server). 117 first: GOV.UK (official) says to call 117 from a mobile, and to ask it for an ambulance.
 * 118: Antananarivo fire brigade. 124 (SAMU): secondary sources only, not confirmed officially.
 */
export const EMERGENCY_NUMBERS: readonly EmergencyNumber[] = [
  { numero: '117', libelle: 'Police · urgences' },
  { numero: '118', libelle: 'Pompiers' },
  { numero: '124', libelle: 'SAMU (ambulance)' },
];

/** The phone app opens on this number (tel: scheme). No canOpenURL check: false on Android 11+ without <queries>. */
export const callUrl = (numero: string): string => `tel:${numero}`;
