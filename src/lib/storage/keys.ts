import { createHash, randomUUID } from 'node:crypto';

import { StorageError } from './types';

/**
 * Generación y validación de claves de almacenamiento.
 *
 * La regla que gobierna este fichero: **la ruta en disco nunca se deriva del
 * nombre que envía quien sube el fichero**. Un nombre controlado por el usuario
 * puede contener `../`, separadores, bytes nulos o nombres reservados de
 * Windows, y cualquiera de esas cosas convierte una subida en escritura
 * arbitraria. El nombre original solo aporta la extensión, y filtrada.
 */

/** Extensiones que se aceptan, con su tipo MIME esperado. */
const EXTENSIONES: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  gif: ['image/gif'],
  svg: ['image/svg+xml'],
  csv: ['text/csv', 'application/csv'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  xls: ['application/vnd.ms-excel'],
  json: ['application/json'],
  txt: ['text/plain'],
  zip: ['application/zip'],
};

/** Solo minúsculas, dígitos, guion y barra. Sin puntos: matan el `..`. */
const CLAVE_VALIDA = /^[a-z0-9][a-z0-9/-]*[a-z0-9](\.[a-z0-9]+)?$/;
const PREFIJO_VALIDO = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;

export function extensionDe(filename: string): string | null {
  const punto = filename.lastIndexOf('.');
  if (punto === -1 || punto === filename.length - 1) return null;
  const ext = filename.slice(punto + 1).toLowerCase();
  return Object.hasOwn(EXTENSIONES, ext) ? ext : null;
}

/** El MIME declarado debe corresponderse con la extensión. */
export function extensionCoincideConTipo(ext: string, contentType: string): boolean {
  const tipos = EXTENSIONES[ext];
  if (!tipos) return false;
  const limpio = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return tipos.includes(limpio);
}

/**
 * Construye una clave nueva: `<prefijo>/<uuid>.<ext>`.
 *
 * El UUID evita colisiones y, sobre todo, hace la ruta impredecible: un fichero
 * privado no debe poder adivinarse probando nombres.
 */
export function nuevaClave(input: {
  readonly filename: string;
  readonly contentType: string;
  readonly prefix?: string | undefined;
}): string {
  const ext = extensionDe(input.filename);
  if (!ext) throw new StorageError(`Extensión no admitida: ${input.filename}`, 'invalid_key');
  if (!extensionCoincideConTipo(ext, input.contentType)) {
    throw new StorageError(
      `El tipo declarado (${input.contentType}) no corresponde a .${ext}`,
      'invalid_key',
    );
  }
  const prefijo = input.prefix?.toLowerCase().replace(/^\/+|\/+$/g, '') ?? 'misc';
  if (!PREFIJO_VALIDO.test(prefijo)) {
    throw new StorageError(`Prefijo no válido: ${input.prefix ?? ''}`, 'invalid_key');
  }
  return `${prefijo}/${randomUUID()}.${ext}`;
}

/**
 * Valida una clave antes de tocar el disco.
 *
 * Se comprueba la clave, no la ruta resuelta: es más fácil razonar sobre una
 * lista de caracteres permitidos que sobre todas las formas de escribir `..`.
 */
export function assertClaveValida(storageKey: string): void {
  if (!storageKey || storageKey.length > 512) {
    throw new StorageError('Clave vacía o demasiado larga', 'invalid_key');
  }
  if (storageKey.includes('..') || storageKey.includes('\\') || storageKey.includes('\0')) {
    throw new StorageError('Clave con secuencias no permitidas', 'invalid_key');
  }
  if (storageKey.startsWith('/') || storageKey.includes('//')) {
    throw new StorageError('Clave con barras no permitidas', 'invalid_key');
  }
  if (!CLAVE_VALIDA.test(storageKey)) {
    throw new StorageError('Clave con caracteres no permitidos', 'invalid_key');
  }
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
