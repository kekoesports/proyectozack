import 'server-only';

import { env } from '@/lib/env';

import { LocalStorageProvider } from './local-provider';
import { VercelBlobProvider } from './vercel-provider';
import type { StorageObject, StorageProvider, UploadInput } from './types';
import { StorageError } from './types';

export type { StorageObject, StorageProvider, UploadInput, StorageVisibility } from './types';
export { StorageError } from './types';

/**
 * Punto de entrada del almacenamiento.
 *
 * `STORAGE_DRIVER` decide dónde se **escribe**. Las lecturas son otra historia:
 * mientras dure la migración, si un fichero no está en el proveedor principal
 * se busca en el secundario. Eso es lo que permite empezar a escribir en el
 * VPS sin haber copiado antes el histórico entero, y volver atrás sin pérdida.
 *
 * Cuando el periodo de fallback acabe, se retira el secundario y esta capa se
 * queda con un solo proveedor.
 */

let principal: StorageProvider | undefined;
let secundario: StorageProvider | undefined;

function construirLocal(): LocalStorageProvider {
  const raiz = env.STORAGE_LOCAL_ROOT ?? '/srv/socialpro/storage';
  return new LocalStorageProvider({
    publicRoot: `${raiz}/public`,
    // Fuera de la raíz pública a propósito: si el proxy sirviera este
    // directorio, los permisos de la aplicación dejarían de importar.
    privateRoot: `${raiz}/private`,
    publicUrlBase: env.STORAGE_PUBLIC_URL_BASE,
  });
}

export function getStorage(): StorageProvider {
  if (!principal) {
    principal =
      env.STORAGE_DRIVER === 'local'
        ? construirLocal()
        : new VercelBlobProvider(env.BLOB_READ_WRITE_TOKEN);
  }
  return principal;
}

/** Proveedor de respaldo para lecturas, o null si no procede. */
export function getFallbackStorage(): StorageProvider | null {
  if (env.STORAGE_DRIVER !== 'local') return null;
  if (!env.STORAGE_FALLBACK_TO_VERCEL) return null;
  if (!env.BLOB_READ_WRITE_TOKEN) return null;
  secundario ??= new VercelBlobProvider(env.BLOB_READ_WRITE_TOKEN);
  return secundario;
}

export async function uploadFile(input: UploadInput): Promise<StorageObject> {
  return getStorage().upload(input);
}

export async function deleteFile(storageKey: string): Promise<void> {
  await getStorage().delete(storageKey);
}

/**
 * Abre un fichero, cayendo al proveedor antiguo si hace falta.
 *
 * Devuelve también de dónde salió: sin ese dato no hay forma de saber cuándo se
 * puede retirar el fallback, y se acabaría apagando a ciegas.
 */
export async function openFile(
  storageKey: string,
): Promise<{ stream: ReadableStream<Uint8Array>; from: 'primary' | 'fallback' }> {
  const primario = getStorage();
  try {
    return { stream: await primario.openReadStream(storageKey), from: 'primary' };
  } catch (err) {
    const respaldo = getFallbackStorage();
    if (!respaldo) throw err;
    if (!(err instanceof StorageError) || err.code !== 'not_found') throw err;
    const stream = await respaldo.openReadStream(storageKey);
    // Cada lectura por respaldo es un fichero pendiente de copiar.
    console.warn(`[storage] leído del respaldo: ${storageKey}`);
    return { stream, from: 'fallback' };
  }
}

export async function fileExists(storageKey: string): Promise<boolean> {
  if (await getStorage().exists(storageKey)) return true;
  const respaldo = getFallbackStorage();
  return respaldo ? respaldo.exists(storageKey) : false;
}

/** Solo para tests: obliga a reconstruir los proveedores. */
export function resetStorageForTests(): void {
  principal = undefined;
  secundario = undefined;
}

// ── Compatibilidad con la API anterior ──────────────────────────────────────
//
// Los tres consumidores actuales (ficheros de campaña, de talento y el
// importador de nóminas) siguen llamando con la firma vieja. Se conserva a
// propósito: cambiar el proveedor de almacenamiento y reescribir sus llamadas
// son dos cosas distintas, y mezclarlas haría el PR imposible de revisar.

export type LegacyUploadResult = {
  readonly url: string;
  readonly pathname: string;
  readonly size: number;
};

/**
 * @deprecated Usar `uploadFile` con `UploadInput`. Se mantiene mientras los
 * consumidores guarden URLs en base de datos en vez de `storageKey`.
 */
export async function uploadLegacyFile(input: {
  readonly name: string;
  readonly data: Blob | Buffer | ArrayBuffer;
  readonly contentType: string;
}): Promise<LegacyUploadResult> {
  const buffer = Buffer.isBuffer(input.data)
    ? input.data
    : input.data instanceof ArrayBuffer
      ? Buffer.from(input.data)
      : Buffer.from(await input.data.arrayBuffer());

  const objeto = await getStorage().upload({
    filename: input.name,
    data: buffer,
    contentType: input.contentType,
    visibility: 'private',
    prefix: input.name.includes('/') ? input.name.split('/')[0] : undefined,
  });

  return {
    // Con Vercel esto es la URL del blob, como antes. Con el driver local no
    // hay URL para un privado, así que se devuelve la clave: las rutas proxy
    // ya la aceptan y la resolución definitiva llega con la migración de datos.
    url: objeto.publicUrl ?? objeto.storageKey,
    pathname: objeto.storageKey,
    size: objeto.size,
  };
}

/** @deprecated Acepta URL heredada o `storageKey`. */
export async function deleteLegacyFile(urlOrKey: string): Promise<void> {
  // Una URL de Vercel Blob lleva el pathname tras el host.
  const clave = urlOrKey.startsWith('http')
    ? new URL(urlOrKey).pathname.replace(/^\/+/, '')
    : urlOrKey;
  await getStorage().delete(clave);
}
