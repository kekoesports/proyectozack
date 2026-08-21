import { createHash } from 'node:crypto';

/**
 * Serialización canónica: la misma estructura produce siempre exactamente la
 * misma cadena.
 *
 * De esto depende que una aprobación signifique algo. Si `{a:1,b:2}` y
 * `{b:2,a:1}` produjeran hashes distintos, el humano aprobaría una acción y el
 * worker ejecutaría otra sin que nadie lo notara; y si produjeran el mismo hash
 * dos acciones realmente distintas, una aprobación serviría para la otra.
 *
 * Reglas, todas por el mismo motivo —eliminar ambigüedad, no ser bonito—:
 *
 * - claves de objeto ordenadas por punto de código;
 * - `undefined` desaparece en objetos y se vuelve `null` en arrays, igual que
 *   hace `JSON.stringify`, pero de forma explícita;
 * - los arrays conservan el orden: `[1,2]` y `[2,1]` no son lo mismo;
 * - sin espacios ni saltos de línea;
 * - `NaN` e `Infinity` se rechazan en vez de convertirse en `null`, porque un
 *   importe que llega roto no debe hashearse como si fuera cero;
 * - las referencias cíclicas se rechazan.
 */

export class CanonicalJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanonicalJsonError';
  }
}

type Primitivo = string | number | boolean | null;

function esPrimitivoSerializable(valor: unknown): valor is Primitivo {
  return (
    valor === null ||
    typeof valor === 'string' ||
    typeof valor === 'boolean' ||
    (typeof valor === 'number' && Number.isFinite(valor))
  );
}

function serializar(valor: unknown, vistos: Set<object>, ruta: string): string {
  if (valor === null) return 'null';

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      throw new CanonicalJsonError(`Número no finito en ${ruta}: JSON no puede representarlo sin mentir`);
    }
    // `-0` y `0` son el mismo número para cualquier lector humano.
    return JSON.stringify(valor === 0 ? 0 : valor);
  }

  if (typeof valor === 'string' || typeof valor === 'boolean') {
    return JSON.stringify(valor);
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      throw new CanonicalJsonError(`Fecha inválida en ${ruta}`);
    }
    return JSON.stringify(valor.toISOString());
  }

  if (typeof valor === 'bigint') {
    // Sin pérdida de precisión: como cadena, no como número.
    return JSON.stringify(valor.toString());
  }

  if (typeof valor === 'function' || typeof valor === 'symbol') {
    throw new CanonicalJsonError(`Valor no serializable (${typeof valor}) en ${ruta}`);
  }

  if (typeof valor === 'object') {
    if (vistos.has(valor)) {
      throw new CanonicalJsonError(`Referencia cíclica en ${ruta}`);
    }
    vistos.add(valor);

    try {
      if (Array.isArray(valor)) {
        const partes = valor.map((item, i) =>
          item === undefined ? 'null' : serializar(item, vistos, `${ruta}[${i}]`),
        );
        return `[${partes.join(',')}]`;
      }

      const entradas = Object.entries(valor as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

      const partes = entradas.map(
        ([k, v]) => `${JSON.stringify(k)}:${serializar(v, vistos, `${ruta}.${k}`)}`,
      );
      return `{${partes.join(',')}}`;
    } finally {
      vistos.delete(valor);
    }
  }

  throw new CanonicalJsonError(`Valor no serializable en ${ruta}`);
}

/** Serializa de forma determinista. Lanza `CanonicalJsonError` si no se puede. */
export function canonicalJsonStringify(valor: unknown): string {
  if (valor === undefined) return 'null';
  return serializar(valor, new Set<object>(), '$');
}

/** SHA-256 en hexadecimal. 64 caracteres, que es lo que esperan las columnas. */
export function sha256Hex(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

/** Hash canónico de cualquier estructura serializable. */
export function canonicalHash(valor: unknown): string {
  return sha256Hex(canonicalJsonStringify(valor));
}

export { esPrimitivoSerializable as isSerializablePrimitive };
