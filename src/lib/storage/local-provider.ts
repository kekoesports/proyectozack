import 'server-only';

import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';

import { assertClaveValida, nuevaClave, sha256 } from './keys';
import type { StorageObject, StorageProvider, UploadInput } from './types';
import { StorageError } from './types';

/**
 * Almacenamiento en el disco del servidor.
 *
 * Dos raíces separadas: la pública puede servirse por HTTP; la privada **nunca**
 * debe quedar bajo un directorio que sirva el proxy. Si un fichero privado se
 * puede pedir por URL, la comprobación de permisos de la aplicación deja de
 * significar nada.
 *
 * Las escrituras son atómicas: se escribe un temporal y se renombra. Sin eso,
 * un corte a mitad de subida deja un fichero truncado que parece válido —
 * tiene nombre, tiene tamaño— y solo se descubre al abrirlo.
 */

const TAMANO_MAXIMO = 50 * 1024 * 1024; // 50 MB

export type LocalProviderOptions = {
  readonly publicRoot: string;
  readonly privateRoot: string;
  /** Prefijo público bajo el que el proxy sirve `publicRoot`. */
  readonly publicUrlBase?: string | undefined;
};

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;

  constructor(private readonly opciones: LocalProviderOptions) {}

  private raiz(visibility: 'public' | 'private'): string {
    return visibility === 'public' ? this.opciones.publicRoot : this.opciones.privateRoot;
  }

  /**
   * Resuelve la clave a una ruta y comprueba que no se ha salido de la raíz.
   *
   * `assertClaveValida` ya filtra `..`, pero esto es la segunda barrera: aquí se
   * verifica el resultado real de la resolución. Si alguna vez la validación de
   * la clave se relaja, esto sigue impidiendo escribir fuera del directorio.
   */
  private rutaDe(storageKey: string, visibility: 'public' | 'private'): string {
    assertClaveValida(storageKey);
    const raiz = resolve(this.raiz(visibility));
    const destino = resolve(join(raiz, storageKey));
    if (destino !== raiz && !destino.startsWith(raiz + sep)) {
      throw new StorageError('La clave resuelve fuera del directorio de almacenamiento', 'invalid_key');
    }
    return destino;
  }

  /** La visibilidad no viaja en la clave: se prueba dónde está el fichero. */
  private async localizar(storageKey: string): Promise<{ ruta: string; visibility: 'public' | 'private' } | null> {
    for (const visibility of ['private', 'public'] as const) {
      const ruta = this.rutaDe(storageKey, visibility);
      try {
        await stat(ruta);
        return { ruta, visibility };
      } catch {
        // seguir probando
      }
    }
    return null;
  }

  async upload(input: UploadInput): Promise<StorageObject> {
    if (input.data.byteLength > TAMANO_MAXIMO) {
      throw new StorageError(
        `El fichero supera el máximo de ${TAMANO_MAXIMO} bytes`,
        'too_large',
      );
    }
    const storageKey = nuevaClave({
      filename: input.filename,
      contentType: input.contentType,
      prefix: input.prefix,
    });
    const destino = this.rutaDe(storageKey, input.visibility);
    await mkdir(dirname(destino), { recursive: true, mode: 0o750 });

    // Temporal + rename: el rename es atómico dentro del mismo sistema de
    // ficheros, así que nadie puede leer una versión a medio escribir.
    const temporal = `${destino}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporal, input.data, { mode: 0o640 });
      await rename(temporal, destino);
    } catch (err) {
      await rm(temporal, { force: true }).catch(() => {});
      throw new StorageError(
        `No se pudo escribir el fichero: ${err instanceof Error ? err.name : 'error'}`,
        'io_error',
      );
    }

    return {
      storageKey,
      size: input.data.byteLength,
      contentType: input.contentType,
      checksum: sha256(input.data),
      visibility: input.visibility,
      publicUrl: input.visibility === 'public' ? this.getPublicUrl(storageKey) : null,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const encontrado = await this.localizar(storageKey);
    if (!encontrado) return; // borrar lo que no está no es un error
    await rm(encontrado.ruta, { force: true });
  }

  async exists(storageKey: string): Promise<boolean> {
    return (await this.localizar(storageKey)) !== null;
  }

  async openReadStream(storageKey: string): Promise<ReadableStream<Uint8Array>> {
    const encontrado = await this.localizar(storageKey);
    if (!encontrado) throw new StorageError(`No existe: ${storageKey}`, 'not_found');
    // Stream, no readFile: un PDF de 40 MB no debe pasar entero por memoria.
    return Readable.toWeb(createReadStream(encontrado.ruta)) as ReadableStream<Uint8Array>;
  }

  getPublicUrl(storageKey: string): string | null {
    if (!this.opciones.publicUrlBase) return null;
    assertClaveValida(storageKey);
    return `${this.opciones.publicUrlBase.replace(/\/+$/, '')}/${storageKey}`;
  }
}
