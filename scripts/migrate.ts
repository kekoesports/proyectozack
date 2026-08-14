import { readFileSync } from 'fs';
import { join } from 'path';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

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

const isPreview = process.env.VERCEL_ENV === 'preview';
const runPreviewMigrations =
  process.env.RUN_MIGRATIONS_IN_PREVIEW === 'true';

if (isPreview && !runPreviewMigrations) {
  console.log(
    'Skipping database migrations in Vercel Preview deployment. Set RUN_MIGRATIONS_IN_PREVIEW=true on an isolated preview branch to opt in.',
  );
  process.exit(0);
}

if (isPreview) {
  console.log('Preview database migrations explicitly enabled.');
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const fetchEndpoint = process.env.NEON_HTTP_FETCH_ENDPOINT;
if (fetchEndpoint) neonConfig.fetchEndpoint = fetchEndpoint;

const sql = neon(url);
const db = drizzle(sql);

async function main(): Promise<void> {
  console.log('Applying migrations from ./drizzle ...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
