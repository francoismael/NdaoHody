import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL sends BIGINT and DECIMAL values as strings (to keep their precision).
 * Our ids and ratings fit in a JavaScript number.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};
