/** Settings changed by the super admin (table parametre). */
export abstract class SettingRepository {
  /** null when the key is missing or its value is not a number. */
  abstract findNumber(cle: string): Promise<number | null>;
}
