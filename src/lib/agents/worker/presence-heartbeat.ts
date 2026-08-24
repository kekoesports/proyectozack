import 'server-only';

import { logRedacted } from '@/lib/log';
import { touchWorkerHeartbeat } from '@/lib/queries/agents/workers';

/** Debe quedar holgadamente dentro de la ventana de 120 s del CRM. */
export const WORKER_PRESENCE_HEARTBEAT_MS = 30_000;

type PresenceHeartbeatOptions = {
  readonly workerId: string;
  readonly version: string;
  readonly hostname: string;
  readonly intervalMs?: number;
  /** Inyección para tests; producción usa la escritura real en PostgreSQL. */
  readonly writeHeartbeat?: () => Promise<void>;
};

export type WorkerPresenceHeartbeat = {
  /** Marca healthy inmediatamente, por ejemplo tras el primer tick. */
  readonly touch: () => Promise<void>;
  /** Detiene el temporizador y espera cualquier escritura que siga en vuelo. */
  readonly stop: () => Promise<void>;
};

/**
 * Mantiene visible un worker aunque esté ocioso o una ejecución dure minutos.
 *
 * Solo permite una escritura en vuelo. Si PostgreSQL tarda más que el intervalo
 * no amontona promesas ni conexiones; el siguiente latido vuelve a intentarlo.
 */
export function startWorkerPresenceHeartbeat(
  options: PresenceHeartbeatOptions,
): WorkerPresenceHeartbeat {
  const write =
    options.writeHeartbeat ??
    (() =>
      touchWorkerHeartbeat({
        workerId: options.workerId,
        version: options.version,
        hostname: options.hostname,
      }));

  let stopped = false;
  let inFlight: Promise<void> | null = null;

  const touch = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (inFlight) return inFlight;

    inFlight = write()
      .catch((error: unknown) => {
        logRedacted('warn', '[agents] fallo renovando el latido del worker:', error);
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const timer = setInterval(
    () => {
      void touch();
    },
    options.intervalMs ?? WORKER_PRESENCE_HEARTBEAT_MS,
  );
  timer.unref();

  return {
    touch,
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}
