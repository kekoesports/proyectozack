import {
  isMemoryReadableInPrompt,
  type AgentMemorySensitivity,
  type AgentMemoryScope,
  type AgentMemoryVerification,
} from './memory-scope';

/**
 * Ensamblado del bloque de memoria que ve el modelo.
 *
 * Dos decisiones que definen para qué sirve la memoria en este sistema:
 *
 * 1. **Solo hechos verificados y vigentes.** Lo que alguien propuso pero nadie
 *    confirmó no entra en un prompt. Si entrara, el agente citaría como cierto
 *    algo que solo era una hipótesis suya de la semana pasada.
 * 2. **La memoria no sustituye a una consulta.** Aquí van políticas, umbrales,
 *    convenciones y runbooks. Los importes, los estados y las fechas se leen
 *    del CRM con una tool, cada vez. Un dato vivo memorizado es un dato que
 *    envejece sin avisar.
 */

export type MemoryRow = {
  readonly id: number;
  readonly scope: AgentMemoryScope;
  readonly scopeUserId: string | null;
  readonly agentId: number | null;
  readonly memoryKey: string;
  readonly content: string;
  readonly sensitivity: AgentMemorySensitivity;
  readonly verificationStatus: AgentMemoryVerification;
  readonly validUntil: Date | null;
  readonly sourceType: string;
};

export type MemoryReader = {
  readonly agentId: number;
  readonly userId: string | null;
};

/** Tope del bloque de memoria en el prompt. */
export const MAX_MEMORY_BLOCK_CHARS = 4_000;
/** Tope de hechos, aunque quepan. */
export const MAX_MEMORY_ITEMS = 25;

export type AssembledMemory = {
  readonly text: string;
  readonly usedIds: readonly number[];
  /** Descartados por scope, verificación, caducidad o sensibilidad. */
  readonly skippedCount: number;
  /** `true` si algo cupo fuera por el tope de tamaño. */
  readonly truncated: boolean;
};

/**
 * Construye el bloque de memoria.
 *
 * El filtro se aplica **otra vez** aquí aunque la query de PR 1 ya filtre en
 * SQL. No es redundancia inútil: la lista puede llegar de un caché, de un test
 * o de un futuro camino que no pase por esa query, y el coste de comprobarlo
 * es nulo comparado con inyectar la memoria de otro usuario en un prompt.
 */
export function assembleMemoryBlock(
  filas: readonly MemoryRow[],
  lector: MemoryReader,
  ahora: Date,
): AssembledMemory {
  const admisibles = filas.filter((f) => isMemoryReadableInPrompt(f, lector, ahora));
  const descartadas = filas.length - admisibles.length;

  const usados: number[] = [];
  const lineas: string[] = [];
  let longitud = 0;
  let truncado = false;

  for (const fila of admisibles.slice(0, MAX_MEMORY_ITEMS)) {
    const linea = `- [${fila.memoryKey}] ${fila.content} (fuente: ${fila.sourceType})`;
    if (longitud + linea.length > MAX_MEMORY_BLOCK_CHARS) {
      truncado = true;
      break;
    }
    lineas.push(linea);
    usados.push(fila.id);
    longitud += linea.length + 1;
  }

  if (admisibles.length > MAX_MEMORY_ITEMS) truncado = true;

  if (lineas.length === 0) {
    return { text: '', usedIds: [], skippedCount: descartadas, truncated: truncado };
  }

  const text = [
    'MEMORIA VERIFICADA (hechos estables confirmados por una persona):',
    ...lineas,
    '',
    'Esta memoria NO contiene datos vivos. Importes, estados y fechas se consultan',
    'siempre con una herramienta, nunca se recuerdan.',
  ].join('\n');

  return { text, usedIds: usados, skippedCount: descartadas, truncated: truncado };
}

/**
 * Sensibilidad máxima que puede llegar al prompt.
 *
 * `restricted` se queda fuera siempre: existe para poder registrar que algo se
 * sabe sin exponerlo al modelo. Si hiciera falta para razonar, se consulta con
 * una tool auditada, que deja traza de quién lo pidió y cuándo.
 */
export const MAX_PROMPT_SENSITIVITY: AgentMemorySensitivity = 'confidential';
