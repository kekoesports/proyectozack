/** Ephemeral local QA database. Generates schema, seeds synthetic identities, binds loopback only. */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { hashPassword } from 'better-auth/crypto';
import * as schema from '../src/db/schema';
import { createStudioRepository } from '../src/lib/studio/repository';

async function main() {
  const pg = new PGlite();
  const database = drizzle(pg, { schema });
  for (const statement of await generateMigration(
    generateDrizzleJson({}),
    generateDrizzleJson(schema),
  ))
    await pg.exec(statement);
  const now = new Date();
  const password = await hashPassword('Studio-fixture-only-2026!');
  await database.insert(schema.user).values(
    ['creator', 'agency', 'other'].map((kind) => ({
      id: `studio-qa-${kind}`,
      name: kind === 'creator' ? 'Creador demo · QA' : `QA ${kind}`,
      email: `${kind}@studio.test`,
      role: kind === 'agency' ? 'admin' : 'creator',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    })),
  );
  await database.insert(schema.account).values(
    ['creator', 'agency', 'other'].map((kind) => ({
      id: `studio-account-${kind}`,
      userId: `studio-qa-${kind}`,
      accountId: `studio-qa-${kind}`,
      providerId: 'credential',
      password,
      createdAt: now,
      updatedAt: now,
    })),
  );
  const talents = await database
    .insert(schema.talents)
    .values(
      ['creator', 'other'].map((kind) => ({
        slug: `studio-qa-${kind}`,
        name: kind === 'creator' ? 'Creador demo · QA' : 'Otro creador · QA',
        role: 'Creator',
        game: 'CS2',
        platform: 'youtube' as const,
        bio: 'Fixture sintética, no es un talento real.',
        gradientC1: '#e03070',
        gradientC2: '#8b3aad',
        initials: 'QA',
      })),
    )
    .returning();
  const creator = talents[0];
  const other = talents[1];
  if (!creator || !other) throw new Error('fixture');
  await database.insert(schema.talentUsers).values([
    { talentId: creator.id, userId: 'studio-qa-creator' },
    { talentId: other.id, userId: 'studio-qa-other' },
  ]);
  const repo = createStudioRepository(database, 'studio-qa-creator');
  await repo.save({
    title: 'Una decisión antes de cada ronda',
    template: 'educational',
    platform: 'tiktok',
    brief:
      'Proyecto de demostración: explicar una decisión de equipo sin inventar estadísticas.',
    script:
      'Antes de empezar la ronda, acuerda una idea con tu equipo.\n\nEnseña un ejemplo propio y explica qué decisión tomaste.\n\nCierra con algo que la audiencia pueda probar en su próxima partida.',
    cta: 'Guárdalo para tu próxima partida.',
  });
  const server = new PGLiteSocketServer({
    db: pg,
    host: '127.0.0.1',
    port: 55439,
    maxConnections: 20,
  });
  await server.start();
  console.log(
    'Studio synthetic fixture ready on loopback port 55439. No persistent database or production data.',
  );
  const stop = () => {
    void server
      .stop()
      .then(() => pg.close())
      .then(() => process.exit(0));
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
main().catch(() => {
  console.error('Studio fixture failed');
  process.exitCode = 1;
});
