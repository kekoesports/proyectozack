/** Create admin user in DB. Run: npx tsx scripts/create-admin.ts */
import { readFileSync } from 'fs';
import { join } from 'path';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { neon } from '@neondatabase/serverless';

// Load .env.local
try {
  const envPath = join(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

  const email = process.env.ADMIN_EMAIL ?? 'admin@socialpro.es';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) { console.error('ADMIN_PASSWORD env var required'); process.exit(1); }
  const name = process.env.ADMIN_NAME ?? 'Admin SocialPro';

  // Hash password using Better Auth's exact scrypt config
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = await scryptAsync(password.normalize('NFKC'), salt, {
    N: 16384, p: 1, r: 16, dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });
  const hashedPassword = `${salt}:${bytesToHex(key)}`;

  const sql = neon(DATABASE_URL);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert user
  await sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
            VALUES (${userId}, ${name}, ${email}, true, ${now}::timestamptz, ${now}::timestamptz)
            ON CONFLICT (email) DO NOTHING`;

  // Get user id (in case it already existed)
  const [user] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  const uid = user.id;

  // Upsert account with credential provider
  await sql`DELETE FROM account WHERE "userId" = ${uid} AND "providerId" = 'credential'`;
  const accountId = crypto.randomUUID();
  await sql`INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
            VALUES (${accountId}, ${uid}, 'credential', ${uid}, ${hashedPassword}, ${now}::timestamptz, ${now}::timestamptz)`;

  console.log('Admin user created successfully.');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
