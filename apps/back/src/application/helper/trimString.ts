/** class-transformer: trims a text field before validation (other values are left as they are). */
export function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
