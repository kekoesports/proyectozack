import { config } from 'dotenv';
config({ path: '.env.local' });

import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../src/db/schema';
import { GUARDIAN_SCHEDULES, GUARDIAN_SLUG } from '../src/lib/agents/guardian/definition';

/**
 * Siembra las rutinas de Guardian, **desactivadas**.
 *
 * Idempotente: correrlo dos veces deja la base igual. Y nunca activa nada —
 * `enabled` no aparece en el `set` del upsert, así que si alguien activó una
 * rutina a mano, volver a sembrar no la apaga; y si nunca la activó, sigue
 * apagada.
 *
 *   npx tsx scripts/seed-guardian-schedules.ts
 *
 * Activar `guardian-daily` es lo que convierte a Guardian en algo que actúa
 * solo. Eso es una decisión con nombre y fecha, no un efecto de desplegar.
 */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const conn = neon(process.env.DATABASE_URL);
const db = drizzle(conn, { schema });

async function main(): Promise<void> {
  const [agente] = await db
    .select({ id: schema.agentDefinitions.id })
    .from(schema.agentDefinitions)
    .where(eq(schema.agentDefinitions.slug, GUARDIAN_SLUG))
    .limit(1);

  if (!agente) {
    throw new Error(`No existe el agente '${GUARDIAN_SLUG}'. Ejecuta antes: npm run seed:agents`);
  }

  console.log(`Sembrando ${GUARDIAN_SCHEDULES.length} rutinas de Guardian (desactivadas)...`);

  for (const rutina of GUARDIAN_SCHEDULES) {
    await db
      .insert(schema.agentSchedules)
      .values({
        slug: rutina.slug,
        agentId: agente.id,
        name: rutina.name,
        cronExpression: rutina.cronExpression,
        timezone: rutina.timezone,
        // Desactivada, siempre.
        enabled: false,
        catchUpPolicy: rutina.catchUpPolicy,
        maxCatchUpRuns: rutina.maxCatchUpRuns,
        inputJson: rutina.inputJson,
      })
      .onConflictDoUpdate({
        target: schema.agentSchedules.slug,
        // Sin `enabled`: activar o desactivar una rutina es decisión humana.
        set: {
          agentId: agente.id,
          name: rutina.name,
          cronExpression: rutina.cronExpression,
          timezone: rutina.timezone,
          catchUpPolicy: rutina.catchUpPolicy,
          maxCatchUpRuns: rutina.maxCatchUpRuns,
          inputJson: rutina.inputJson,
          updatedAt: new Date(),
        },
      });

    console.log(`  · ${rutina.slug} — ${rutina.cronExpression} (${rutina.timezone})`);
  }

  console.log('');
  console.log('Listo. Ninguna rutina se ha activado.');
  console.log('Para activar una hace falta calcular su próxima ventana desde el worker:');
  console.log('  npm run agents:schedules:tick');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
