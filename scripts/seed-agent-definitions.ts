import { config } from 'dotenv';
config({ path: '.env.local' });

import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../src/db/schema';
import { AGENT_CATALOG, SEED_AGENT_MODE, SEED_AGENT_STATUS } from '../src/lib/agents/catalog';

/**
 * Siembra las definiciones de los seis agentes de Zack Agent OS.
 *
 * Idempotente y no destructivo. Correrlo dos veces deja la base igual, y
 * correrlo sobre una base ya en uso NO revierte decisiones humanas: `status` y
 * `mode` solo se escriben al insertar. Si alguien activó Guardian, un
 * redespliegue no lo apaga por detrás.
 *
 * Lo que sí se refresca en cada pasada es lo que vive en el repositorio:
 * nombre, descripción, versiones de prompt/política y límites operativos.
 *
 *   npx tsx scripts/seed-agent-definitions.ts
 *
 * No activa nada: los agentes nuevos entran en disabled + shadow, y ninguna
 * rutina se crea aquí. Ver docs/agent-os/pr1-runtime-schema.md.
 */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const conn = neon(process.env.DATABASE_URL);
const db = drizzle(conn, { schema });

async function main(): Promise<void> {
  console.log(`Sembrando ${AGENT_CATALOG.length} definiciones de agente...`);

  let insertados = 0;
  let actualizados = 0;

  for (const agente of AGENT_CATALOG) {
    const [existente] = await db
      .select({ id: schema.agentDefinitions.id })
      .from(schema.agentDefinitions)
      .where(eq(schema.agentDefinitions.slug, agente.slug))
      .limit(1);

    await db
      .insert(schema.agentDefinitions)
      .values({
        slug: agente.slug,
        displayName: agente.displayName,
        description: agente.description,
        status: SEED_AGENT_STATUS,
        mode: SEED_AGENT_MODE,
        promptVersion: agente.promptVersion,
        policyVersion: agente.policyVersion,
        modelProvider: agente.modelProvider,
        modelName: agente.modelName,
        maxConcurrentRuns: agente.maxConcurrentRuns,
        maxRunsPerDay: agente.maxRunsPerDay,
        maxTurnsPerRun: agente.maxTurnsPerRun,
        maxToolCallsPerRun: agente.maxToolCallsPerRun,
        maxDurationSeconds: agente.maxDurationSeconds,
        monthlyBudgetMicros: agente.monthlyBudgetMicros,
        // Lo único que va en settings: el rol con el que se ejecuta sin humano
        // detrás. Nada sensible — un rol no es un secreto — y sin él las tools
        // que exijan un permiso que `analyst` no tiene fallarían en silencio.
        settingsJson: agente.systemRole ? { systemRole: agente.systemRole } : {},
      })
      .onConflictDoUpdate({
        target: schema.agentDefinitions.slug,
        // Sin `status` ni `mode`: reactivar o apagar un agente es decisión
        // humana, nunca efecto colateral de volver a sembrar.
        set: {
          displayName: agente.displayName,
          description: agente.description,
          promptVersion: agente.promptVersion,
          policyVersion: agente.policyVersion,
          modelProvider: agente.modelProvider,
          modelName: agente.modelName,
          maxConcurrentRuns: agente.maxConcurrentRuns,
          maxRunsPerDay: agente.maxRunsPerDay,
          maxTurnsPerRun: agente.maxTurnsPerRun,
          maxToolCallsPerRun: agente.maxToolCallsPerRun,
          maxDurationSeconds: agente.maxDurationSeconds,
          monthlyBudgetMicros: agente.monthlyBudgetMicros,
          updatedAt: new Date(),
        },
      });

    if (existente) actualizados += 1;
    else insertados += 1;
  }

  console.log(`Listo: ${insertados} insertados, ${actualizados} actualizados.`);
  console.log(`Todos los agentes nuevos quedan en status=${SEED_AGENT_STATUS}, mode=${SEED_AGENT_MODE}.`);
  console.log('No se ha creado ninguna rutina ni se ha activado nada.');
}


main().catch((err) => {
  console.error(err);
  process.exit(1);
});
