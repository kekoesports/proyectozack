import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

import { config } from 'dotenv';

config({ path: '.env.local' });

/**
 * Punto de entrada del worker de agentes.
 *
 * Proceso aparte de Next.js, a propósito: una ejecución de agente puede durar
 * minutos y no cabe en una petición HTTP. Que sea un proceso independiente
 * también significa que se puede parar, actualizar o desactivar sin tocar la
 * web ni el CRM.
 *
 * ```bash
 * npm run agents:worker              # bucle continuo
 * npm run agents:worker:once         # una vuelta y sale
 * npm run agents:schedules:tick      # solo materializa rutinas
 * ```
 *
 * Con `AGENTS_ENABLED` distinto de `'true'` arranca, no hace nada y lo dice.
 * Es lo que permite desplegarlo antes de decidir encenderlo.
 */

async function main(): Promise<void> {
  // Los imports van dentro porque `@/lib/env` valida al cargarse y necesita el
  // .env ya leído.
  const { runWorkerLoop } = await import('@/lib/agents/worker/worker');
  const { createShutdownController } = await import('@/lib/agents/worker/shutdown');
  const { areAgentsEnabled } = await import('@/lib/agents/runtime-flags');

  const args = new Set(process.argv.slice(2));
  const workerId = process.env.AGENT_WORKER_ID ?? `worker-${randomUUID().slice(0, 8)}`;
  const version = process.env.GIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev';

  if (!areAgentsEnabled()) {
    console.log('[agents] AGENTS_ENABLED no es "true": el worker no procesará nada.');
    if (args.has('--once') || args.has('--schedules-only')) return;
    console.log('[agents] Se queda a la espera por si se activa sin reiniciar.');
  }

  const shutdown = createShutdownController({
    onSignal: (motivo) => console.log(`[agents] señal ${motivo}: drenando…`),
  });

  await runWorkerLoop({
    workerId,
    version,
    hostname: hostname(),
    once: args.has('--once'),
    schedulesOnly: args.has('--schedules-only'),
    shutdown,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[agents] el worker terminó con error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
