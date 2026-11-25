import { randomBytes } from 'crypto';
import { parseArgs } from 'util';
import { hash } from 'bcryptjs';
import { normalizeEmail } from '../../domain/entity/AdminAccount';
import { BCRYPT_COST } from '../adapter/BcryptPasswordHasherAdapter';
import dataSource from '../persistence/postgres/dataSource';

/**
 * Creates a super admin account (npm run admin:create-super -- --email ... --name "...").
 * Super admins never come from the API: this command is the only way in.
 * A random password is printed once; change it after the first sign-in.
 */
const USAGE = 'Usage: npm run admin:create-super -- --email super@ndaohody.mg --name "Nom Complet"';
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function createSuperAdmin(): Promise<void> {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
  const email = normalizeEmail(values.email ?? '');
  const nomComplet = (values.name ?? '').trim();
  if (!EMAIL_FORMAT.test(email) || nomComplet.length < 2) {
    throw new Error(USAGE);
  }

  const password = randomBytes(12).toString('base64url');
  await dataSource.initialize();
  try {
    const existing: unknown[] = await dataSource.query('SELECT 1 FROM administrateur WHERE email = $1', [email]);
    if (existing.length > 0) {
      throw new Error(`An account already uses ${email}.`);
    }
    await dataSource.query(
      `INSERT INTO administrateur (nom_complet, email, mot_de_passe, role, actif) VALUES ($1, $2, $3, 'super_admin', TRUE)`,
      [nomComplet, email, await hash(password, BCRYPT_COST)],
    );
  } finally {
    await dataSource.destroy();
  }

  console.log(`Super admin created: ${email}`);
  console.log(`Temporary password (shown only once): ${password}`);
}

createSuperAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
