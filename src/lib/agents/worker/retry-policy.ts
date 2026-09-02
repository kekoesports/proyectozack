import {
  computeRetryDelayMs,
  isIndeterminateErrorCode,
  isRetryableErrorCode,
} from '../run-state';
import type { AgentRunStatus } from '../run-state';

/**
 * Qué hacer con una ejecución que no terminó bien.
 *
 * Tres desenlaces, y la diferencia entre ellos es el daño que causa
 * equivocarse:
 *
 * - **Reintentar** un fallo permanente gasta presupuesto y llega al mismo
 *   sitio: molesto, no grave.
 * - **Dar por fallido** algo transitorio pierde trabajo recuperable.
 * - **Reintentar** algo indeterminado puede **duplicar una acción que ya
 *   ocurrió**. Ese es el error caro, y por eso lo indeterminado nunca se
 *   reintenta.
 */

export type RetryDecision =
  | { readonly kind: 'retry'; readonly delayMs: number; readonly availableAt: Date }
  | { readonly kind: 'dead_letter'; readonly reason: string }
  | { readonly kind: 'fail'; readonly reason: string }
  /** No se sabe qué pasó. Termina, no se reintenta, y lo mira una persona. */
  | { readonly kind: 'needs_review'; readonly reason: string };

export type RetryInput = {
  readonly errorCode: string | null;
  /** Decisión explícita del origen del error; si falta, se usa la lista estable de códigos. */
  readonly retryable?: boolean;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly now: Date;
  readonly aleatorio?: number;
};

export function decideRetry(input: RetryInput): RetryDecision {
  // Lo indeterminado se comprueba primero: es la única categoría en la que
  // equivocarse tiene consecuencias irreversibles.
  if (isIndeterminateErrorCode(input.errorCode)) {
    return {
      kind: 'needs_review',
      reason: `${input.errorCode}: no se sabe si la acción llegó a ocurrir`,
    };
  }

  if (input.retryable === false || (input.retryable !== true && !isRetryableErrorCode(input.errorCode))) {
    return { kind: 'fail', reason: input.errorCode ?? 'error_desconocido' };
  }

  if (input.attempt >= input.maxAttempts) {
    return {
      kind: 'dead_letter',
      reason: `agotados ${input.attempt}/${input.maxAttempts} intentos con '${input.errorCode}'`,
    };
  }

  const delayMs = computeRetryDelayMs(input.attempt, input.aleatorio);
  return {
    kind: 'retry',
    delayMs,
    availableAt: new Date(input.now.getTime() + delayMs),
  };
}

/** Estado terminal —o de vuelta a la cola— que corresponde a cada decisión. */
export function statusForDecision(decision: RetryDecision): AgentRunStatus {
  switch (decision.kind) {
    case 'retry':
      return 'retry_scheduled';
    case 'dead_letter':
      return 'dead_letter';
    case 'fail':
    case 'needs_review':
      // `needs_review` acaba en `failed` porque la tabla no tiene un estado
      // propio para "no se sabe". Lo que lo distingue es el `last_error_code`,
      // que `isIndeterminateErrorCode` reconoce y que la UI de PR 4 debe
      // resaltar: no es un fallo cualquiera.
      return 'failed';
  }
}
