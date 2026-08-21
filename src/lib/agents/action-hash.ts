import { canonicalHash } from './canonical-json';

/**
 * Hash de la acción exacta que un humano aprueba.
 *
 * Lo que entra en el hash define qué invalida una aprobación. Entran cuatro
 * cosas y cada una responde a un ataque distinto:
 *
 * - `toolName`: aprobar "enviar email" no autoriza "reiniciar servicio".
 * - `toolVersion`: si la tool cambia lo que hace, la firma anterior no vale.
 * - `input`: cambiar un solo argumento —el destinatario, el importe— invalida.
 * - `policyVersion`: si cambian las reglas bajo las que se concedió, tampoco.
 *
 * Y lo que **no** entra: el id del run. Es deliberado y lo aprovecha el índice
 * `agent_approvals_pending_hash_uq`, que es global: dos ejecuciones que
 * proponen exactamente el mismo envío no abren dos solicitudes que alguien
 * pudiera firmar por separado. Ver docs/agent-os/pr1-runtime-schema.md.
 */

export type ActionHashInput = {
  readonly toolName: string;
  readonly toolVersion: string;
  /** El input **ya validado y redactado**, no el crudo del modelo. */
  readonly input: unknown;
  readonly policyVersion: string;
};

export function buildActionHash(input: ActionHashInput): string {
  return canonicalHash({
    tool: input.toolName,
    version: input.toolVersion,
    policy: input.policyVersion,
    input: input.input,
  });
}

/**
 * Comparación en tiempo constante.
 *
 * Los hashes de acción no son secretos, así que el ataque de temporización es
 * teórico. Se usa igualmente porque el coste es cero y porque `===` sobre un
 * valor que autoriza acciones es la clase de atajo que envejece mal.
 */
export function actionHashEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
