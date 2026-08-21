/**
 * Apagado ordenado.
 *
 * Un contenedor que recibe SIGTERM tiene un plazo corto —normalmente 10 s—
 * antes del SIGKILL. Lo que se hace en ese rato decide si un despliegue deja
 * ejecuciones a medias o no:
 *
 * 1. Dejar de reclamar trabajo nuevo.
 * 2. Dar a lo que está en marcha una oportunidad de terminar.
 * 3. Si no llega, soltar el lease para que otro worker lo recoja **ya**, en vez
 *    de que la ejecución quede parada hasta que el lease venza solo.
 *
 * El paso 3 es el que importa: sin él, un despliegue normal deja cada ejecución
 * en curso congelada durante el lease entero.
 */

export type ShutdownState = {
  /** `true` en cuanto llega la señal. El bucle deja de reclamar. */
  readonly draining: boolean;
  /** Se aborta para que las tools en marcha corten lo que puedan. */
  readonly signal: AbortSignal;
};

export type ShutdownController = {
  readonly state: ShutdownState;
  readonly isDraining: () => boolean;
  /** Espera a que termine el trabajo en curso, con tope. */
  readonly waitForDrain: (timeoutMs: number) => Promise<boolean>;
  readonly markBusy: () => void;
  readonly markIdle: () => void;
  /** Dispara el drenaje a mano; lo usan los tests y `--once`. */
  readonly requestShutdown: (motivo: string) => void;
  readonly reason: () => string | null;
  /** Quita los manejadores de señal. */
  readonly dispose: () => void;
};

export function createShutdownController(opts?: {
  readonly onSignal?: (motivo: string) => void;
  /** Fuera de un proceso real (tests) no hay señales que escuchar. */
  readonly listenToSignals?: boolean;
}): ShutdownController {
  const abort = new AbortController();
  let draining = false;
  let ocupado = 0;
  let motivo: string | null = null;

  const requestShutdown = (razon: string): void => {
    if (draining) return;
    draining = true;
    motivo = razon;
    abort.abort();
    opts?.onSignal?.(razon);
  };

  const manejadores: Array<[NodeJS.Signals, () => void]> = [];
  if (opts?.listenToSignals !== false) {
    for (const señal of ['SIGTERM', 'SIGINT'] as const) {
      const handler = (): void => requestShutdown(señal);
      process.on(señal, handler);
      manejadores.push([señal, handler]);
    }
  }

  return {
    state: {
      get draining() {
        return draining;
      },
      signal: abort.signal,
    },
    isDraining: () => draining,
    markBusy: () => {
      ocupado += 1;
    },
    markIdle: () => {
      ocupado = Math.max(0, ocupado - 1);
    },
    requestShutdown,
    reason: () => motivo,
    dispose: () => {
      for (const [señal, handler] of manejadores) process.off(señal, handler);
    },
    /**
     * `true` si el trabajo en curso terminó dentro del plazo.
     *
     * Sondea en vez de usar promesas encadenadas porque el trabajo puede estar
     * en cualquier punto del bucle y no hay un único punto de finalización al
     * que engancharse.
     */
    waitForDrain: async (timeoutMs: number) => {
      const limite = Date.now() + timeoutMs;
      while (ocupado > 0 && Date.now() < limite) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return ocupado === 0;
    },
  };
}
