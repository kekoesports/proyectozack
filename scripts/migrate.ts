import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { isPreviewDeploy } from '../src/lib/deploy-env';
import { checkMigrationsWillApply } from './migration-skip-guard';

// Load .env.local manually (drizzle-kit/tsx don't auto-load it)
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double) — common in .env files
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  // ignore — fall back to existing env
}

const runPreviewMigrations = process.env.RUN_MIGRATIONS_IN_PREVIEW === 'true';

if (isPreviewDeploy() && !runPreviewMigrations) {
  console.log('Skipping database migrations in preview deployment.');
  process.exit(0);
}

if (isPreviewDeploy()) {
  console.log('Preview migrations explicitly enabled for this deployment.');
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}


// El rol migrador puede ser distinto del de la aplicación: aplica DDL.
const pool = new Pool({ connectionString: process.env.MIGRATION_DATABASE_URL ?? url });
const db = drizzle(pool);

async function main(): Promise<void> {
  // Antes de migrar: comprobar que ninguna pendiente nace por debajo del suelo
  // de la base. Drizzle las saltaría en silencio y el deploy saldría verde.
  const guard = await checkMigrationsWillApply(pool);
  if (!guard.ok) {
    console.error('');
    console.error('MIGRACIONES QUE NO SE APLICARIAN — abortando el deploy');
    console.error('');
    console.error(`  El ultimo created_at en la base es ${guard.suelo} (${new Date(guard.suelo).toISOString()}).`);
    console.error('  Drizzle solo aplica migraciones con un `when` MAYOR que ese valor,');
    console.error('  y estas nacieron por debajo, asi que las daria por aplicadas:');
    console.error('');
    for (const m of guard.saltadas) {
      console.error(`    · ${m.tag}  when=${m.when} (${new Date(m.when).toISOString()})`);
    }
    console.error('');
    console.error(`  Arreglo: subir su "when" en drizzle/meta/_journal.json por encima de ${guard.suelo}`);
    console.error(`  (basta 1 ms: ${guard.suelo + 1}). Bajar el de la anterior NO sirve: su`);
    console.error('  created_at ya esta grabado y la comparacion va contra la base.');
    console.error('');
    process.exit(1);
  }
  if (guard.pendientes > 0) console.log(`Migraciones pendientes: ${guard.pendientes}`);

  console.log('Applying migrations from ./drizzle ...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
