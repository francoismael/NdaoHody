import { readFileSync } from 'fs';
import { join } from 'path';
import dataSource from './data-source';

/**
 * Loads the demo data (npm run db:seed).
 *
 * The rows come from the "2. INSERTIONS" section of donnees.sql, so the demo data
 * is written in a single place. Every table is emptied first: never run in production.
 */
const INSERTS_SECTION = '2. INSERTIONS';
const IGNORED_TABLES = ['migrations', 'spatial_ref_sys'];

function readDemoInserts(): string {
  const sql = readFileSync(join(process.cwd(), 'donnees.sql'), 'utf8');
  const sectionStart = sql.indexOf(INSERTS_SECTION);
  if (sectionStart === -1) {
    throw new Error(`Section "${INSERTS_SECTION}" not found in donnees.sql.`);
  }
  const commentEnd = sql.indexOf('*/', sectionStart);
  return sql.slice(commentEnd + 2);
}

async function seed(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('The demo seed must never run in production.');
  }

  const inserts = readDemoInserts();
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const tables: { tablename: string }[] = await manager.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT (tablename = ANY($1))`,
        [IGNORED_TABLES],
      );
      if (tables.length === 0) {
        throw new Error('No tables found: run npm run db:migrate first.');
      }
      const tableList = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
      await manager.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
      await manager.query(inserts);
    });
    console.log('Demo data loaded.');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
