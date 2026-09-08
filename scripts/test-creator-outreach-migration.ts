import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PGlite } from '@electric-sql/pglite';

async function main(): Promise<void> {
  const pg = new PGlite();
  try {
  await pg.exec('CREATE TABLE "user" ("id" text PRIMARY KEY);');
  const migration = await readFile(join(process.cwd(), 'drizzle/0159_creator_outreach_replies.sql'), 'utf8');
  await pg.exec(migration);

  const first = await pg.query<{ id: number; reply_token: string }>(
    `INSERT INTO creator_outreach_threads (normalized_email) VALUES ('synthetic-test@example.com') RETURNING id, reply_token`,
  );
  assert.match(first.rows[0]?.reply_token ?? '', /^[0-9a-f-]{36}$/);
  await assert.rejects(pg.exec(
    `INSERT INTO creator_outreach_threads (normalized_email) VALUES ('synthetic-test@example.com')`,
  ));

  const threadId = first.rows[0]?.id;
  assert.ok(threadId);
  const insert = `INSERT INTO creator_outreach_messages
    (thread_id, direction, status, idempotency_key, subject, text_body, occurred_at)
    VALUES (${threadId}, 'outbound', 'sending', '11111111-1111-4111-8111-111111111111', 'TEST', 'Synthetic TEST', now())
    ON CONFLICT (idempotency_key) DO NOTHING`;
  await pg.exec(insert);
  await pg.exec(insert);
  const count = await pg.query<{ count: number }>('SELECT count(*)::int AS count FROM creator_outreach_messages');
  assert.equal(count.rows[0]?.count, 1);
  console.log('[creator-outreach-migration] PASS', { syntheticIdentity: 'synthetic-test@example.com', duplicateMessages: 0 });
  } finally {
    await pg.close();
  }
}

void main();
