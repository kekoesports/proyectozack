/** In-memory PostgreSQL; no env files, credentials, persistent DB or external services. */
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  generateDrizzleJson,
  generateMigration,
  upPgSnapshot,
} from 'drizzle-kit/api';
import { hashPassword } from 'better-auth/crypto';
import baseline from '../drizzle/meta/0160_snapshot.json';
import expected from '../drizzle/meta/0161_snapshot.json';
import * as schema from '../src/db/schema';

export async function quickNotesFixture(port: number) {
  assert.deepEqual(await generateMigration(upPgSnapshot(expected), generateDrizzleJson(schema)), [], 'Generated snapshot matches current schema');
  const pg = new PGlite();
  for (const statement of await generateMigration(
    generateDrizzleJson({}),
    upPgSnapshot(baseline),
  ))
    await pg.exec(statement);
  // Apply the checked-in migration, not a schema push. Existing sentinel row must survive unchanged.
  await pg.exec(`INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt",role) VALUES ('history','History QA','history@notes.test',true,now(),now(),'staff');
    INSERT INTO crm_tasks (title,owner_id,category,week_label) VALUES ('HISTORY DO NOT CHANGE','history','General','2025-W01');`);
  await pg.exec(
    await readFile('drizzle/0161_quick_notes_task_notices.sql', 'utf8'),
  );
  const server = new PGLiteSocketServer({
    db: pg,
    host: '127.0.0.1',
    port,
    maxConnections: 20,
  });
  await server.start();
  // PGlite is one backend: serialize transactions. Real PostgreSQL locking requires a separate multi-connection check.
  const pool = new Pool({
    host: '127.0.0.1',
    port,
    user: 'notes_fixture',
    database: 'notes_fixture',
    max: 1,
  });
  const database = drizzle(pool, { schema });
  const now = new Date();
  const people = [
    { id: 'pablo-qa', name: 'Pablo QA', role: 'admin' },
    { id: 'alfonso-qa', name: 'Alfonso QA', role: 'admin_limited_tasks' },
    { id: 'staff-qa', name: 'Staff QA', role: 'staff' },
    { id: 'other-qa', name: 'Other QA', role: 'admin' },
  ];
  await database
    .insert(schema.user)
    .values(
      people.map((p) => ({
        ...p,
        email: p.id + '@notes.test',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      })),
    );
  const password = await hashPassword('Notes-fixture-only-2026!');
  await database
    .insert(schema.account)
    .values(
      people.map((p) => ({
        id: p.id,
        accountId: p.id,
        userId: p.id,
        providerId: 'credential',
        password,
        createdAt: now,
        updatedAt: now,
      })),
    );
  return {
    database,
    pg,
    close: async () => {
      await pool.end();
      await server.stop();
      await pg.close();
    },
  };
}
