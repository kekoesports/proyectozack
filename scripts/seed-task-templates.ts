import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../src/db/schema';
import { SEED_TASK_TEMPLATES } from '../src/db/seeds/taskTemplates';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const conn = neon(process.env.DATABASE_URL);
const db = drizzle(conn, { schema });

async function main(): Promise<void> {
  console.log(`Upserting ${SEED_TASK_TEMPLATES.length} task templates...`);

  const inserted = await db
    .insert(schema.crmTaskTemplates)
    .values(SEED_TASK_TEMPLATES)
    .onConflictDoNothing()
    .returning({ id: schema.crmTaskTemplates.id });

  console.log(`Inserted ${inserted.length} new templates (skipped ${SEED_TASK_TEMPLATES.length - inserted.length} duplicates).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
