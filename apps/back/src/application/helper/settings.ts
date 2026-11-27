import type { SettingRepository } from '../../domain/repository/SettingRepository';

/** A setting of the table parametre, with the value used when it is missing. */
export interface Setting {
  cle: string;
  defaut: number;
}

export const RESPONSE_DELAY_SECONDS: Setting = { cle: 'delai_reponse_secondes', defaut: 180 };
export const MAX_RETRIES: Setting = { cle: 'relances_max', defaut: 2 };
export const ROUTE_MARGIN_METRES: Setting = { cle: 'marge_route_metres', defaut: 30 };
export const MAX_DAYS_AHEAD: Setting = { cle: 'trajet_max_jours_avance', defaut: 15 };
export const ON_SITE_RADIUS_METRES: Setting = { cle: 'rayon_sur_place_metres', defaut: 500 };
export const WAIT_MINUTES: Setting = { cle: 'attente_minutes', defaut: 10 };

export async function readSetting(settings: SettingRepository, setting: Setting): Promise<number> {
  return (await settings.findNumber(setting.cle)) ?? setting.defaut;
}
