/**
 * JSON canónico y hash de acción.
 *
 * De esto depende que una aprobación signifique algo: si el orden de las
 * claves cambiara el hash, el humano firmaría una acción y el worker ejecutaría
 * otra; y si dos acciones distintas colisionaran, una firma serviría para la
 * otra.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { actionHashEquals, buildActionHash } from '@/lib/agents/action-hash';
import {
  CanonicalJsonError,
  canonicalHash,
  canonicalJsonStringify,
} from '@/lib/agents/canonical-json';

describe('canonicalJsonStringify', () => {
  it('el orden de las claves no cambia el resultado', () => {
    expect(canonicalJsonStringify({ a: 1, b: 2 })).toBe(canonicalJsonStringify({ b: 2, a: 1 }));
    expect(canonicalJsonStringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('ordena también las claves anidadas', () => {
    const uno = canonicalJsonStringify({ z: { c: 3, a: 1 }, a: [{ y: 2, x: 1 }] });
    const dos = canonicalJsonStringify({ a: [{ x: 1, y: 2 }], z: { a: 1, c: 3 } });
    expect(uno).toBe(dos);
  });

  it('el orden de un array SÍ importa', () => {
    // Un array es una secuencia: [destinatarioA, destinatarioB] no es lo mismo
    // que al revés, y tratarlos como iguales sería un fallo de seguridad.
    expect(canonicalJsonStringify([1, 2])).not.toBe(canonicalJsonStringify([2, 1]));
  });

  it('descarta undefined en objetos y lo vuelve null en arrays', () => {
    expect(canonicalJsonStringify({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalJsonStringify([1, undefined, 2])).toBe('[1,null,2]');
  });

  it('trata -0 y 0 como el mismo número', () => {
    expect(canonicalJsonStringify({ n: -0 })).toBe(canonicalJsonStringify({ n: 0 }));
  });

  it('serializa fechas como ISO', () => {
    expect(canonicalJsonStringify({ d: new Date('2026-08-21T10:00:00.000Z') })).toBe(
      '{"d":"2026-08-21T10:00:00.000Z"}',
    );
  });

  it('serializa bigint como cadena, sin perder precisión', () => {
    expect(canonicalJsonStringify({ n: BigInt('9007199254740993') })).toBe('{"n":"9007199254740993"}');
  });

  it('rechaza NaN e Infinity en vez de convertirlos en null', () => {
    // `JSON.stringify` los convierte en null y un importe roto se hashearía
    // como si fuera cero.
    expect(() => canonicalJsonStringify({ n: NaN })).toThrow(CanonicalJsonError);
    expect(() => canonicalJsonStringify({ n: Infinity })).toThrow(CanonicalJsonError);
  });

  it('rechaza referencias cíclicas', () => {
    const ciclo: Record<string, unknown> = { a: 1 };
    ciclo.self = ciclo;
    expect(() => canonicalJsonStringify(ciclo)).toThrow(CanonicalJsonError);
  });

  it('rechaza funciones', () => {
    expect(() => canonicalJsonStringify({ f: () => 1 })).toThrow(CanonicalJsonError);
  });

  it('acepta el mismo objeto repetido si no hay ciclo', () => {
    const compartido = { x: 1 };
    expect(canonicalJsonStringify({ a: compartido, b: compartido })).toBe('{"a":{"x":1},"b":{"x":1}}');
  });
});

describe('canonicalHash', () => {
  it('devuelve 64 caracteres hex, que es lo que esperan las columnas', () => {
    expect(canonicalHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('estructuras equivalentes producen el mismo hash', () => {
    expect(canonicalHash({ a: 1, b: [1, 2] })).toBe(canonicalHash({ b: [1, 2], a: 1 }));
  });
});

describe('buildActionHash', () => {
  const base = {
    toolName: 'sendApprovedOutreachEmail',
    toolVersion: '1',
    input: { to: 'contacto@ejemplo.test', subject: 'Hola' },
    policyVersion: 'v0',
  };

  it('es estable para la misma acción', () => {
    expect(buildActionHash(base)).toBe(buildActionHash({ ...base }));
  });

  it('cambiar un argumento invalida la firma', () => {
    expect(buildActionHash(base)).not.toBe(
      buildActionHash({ ...base, input: { to: 'otro@ejemplo.test', subject: 'Hola' } }),
    );
  });

  it('cambiar de tool invalida la firma', () => {
    expect(buildActionHash(base)).not.toBe(buildActionHash({ ...base, toolName: 'restartApprovedService' }));
  });

  it('subir la versión de la tool invalida la firma', () => {
    // Si la tool cambia lo que hace, lo que se aprobó ya no es lo que va a pasar.
    expect(buildActionHash(base)).not.toBe(buildActionHash({ ...base, toolVersion: '2' }));
  });

  it('cambiar la política invalida la firma', () => {
    expect(buildActionHash(base)).not.toBe(buildActionHash({ ...base, policyVersion: 'v1' }));
  });

  it('el orden de los argumentos NO invalida la firma', () => {
    expect(buildActionHash(base)).toBe(
      buildActionHash({ ...base, input: { subject: 'Hola', to: 'contacto@ejemplo.test' } }),
    );
  });

  it('no depende del run: el mismo envío desde dos ejecuciones da el mismo hash', () => {
    // Es lo que aprovecha el índice parcial de aprobaciones pendientes para que
    // nadie firme dos veces la misma acción externa.
    expect(buildActionHash(base)).toBe(buildActionHash({ ...base }));
  });
});

describe('actionHashEquals', () => {
  it('compara correctamente', () => {
    const a = 'a'.repeat(64);
    expect(actionHashEquals(a, a)).toBe(true);
    expect(actionHashEquals(a, 'b'.repeat(64))).toBe(false);
    expect(actionHashEquals(a, 'a'.repeat(63))).toBe(false);
  });
});
