import { config } from 'dotenv';
config({ path: '.env.local' });

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../src/db/schema';
import { OPERATION_AGENT_SCHEDULES } from '../src/lib/agents/operations/definition';
import { normalizePostgresSslMode } from '../src/lib/postgres-url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: normalizePostgresSslMode(databaseUrl) });
const db = drizzle(pool, { schema });

async function main(): Promise<void> {
  for (const schedule of OPERATION_AGENT_SCHEDULES) {
    const [agent] = await db
      .select({ id: schema.agentDefinitions.id })
      .from(schema.agentDefinitions)
      .where(eq(schema.agentDefinitions.slug, schedule.agentSlug))
      .limit(1);
    if (!agent) throw new Error(`No existe el agente '${schedule.agentSlug}'. Ejecuta antes npm run seed:agents`);

    await db
      .insert(schema.agentSchedules)
      .values({
        slug: schedule.slug,
        agentId: agent.id,
        name: schedule.name,
        cronExpression: schedule.cronExpression,
        timezone: schedule.timezone,
        enabled: false,
        catchUpPolicy: schedule.catchUpPolicy,
        maxCatchUpRuns: schedule.maxCatchUpRuns,
        inputJson: schedule.inputJson,
      })
      .onConflictDoUpdate({
        target: schema.agentSchedules.slug,
        set: {
          agentId: agent.id,
          name: schedule.name,
          cronExpression: schedule.cronExpression,
          timezone: schedule.timezone,
          catchUpPolicy: schedule.catchUpPolicy,
          maxCatchUpRuns: schedule.maxCatchUpRuns,
          inputJson: schedule.inputJson,
          updatedAt: new Date(),
        },
      });
  }

  console.log(`Listo: ${OPERATION_AGENT_SCHEDULES.length} rutinas sembradas y ninguna activada por el seed.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
