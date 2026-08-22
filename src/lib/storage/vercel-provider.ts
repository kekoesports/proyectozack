import 'server-only';

import { del, head, put } from '@vercel/blob';

import { nuevaClave, sha256 } from './keys';
import type { StorageObject, StorageProvider, UploadInput } from './types';
import { StorageError } from './types';

/**
 * Vercel Blob detrás de la misma interfaz.
 *
 * Se conserva durante toda la migración: es lo que permite volver atrás y, sobre
 * todo, lo que permite seguir leyendo los ficheros que aún no se han copiado al
 * VPS. No se retira hasta que el periodo de fallback termine.
 *
 * Aquí `storageKey` es el `pathname` del blob, que es como Vercel identifica
 * cada objeto.
 */
export class VercelBlobProvider implements StorageProvider {
  readonly name = 'vercel' as const;

  constructor(private readonly token?: string) {}

  private assertConfigurado(): string {
    if (!this.token) {
      throw new StorageError('BLOB_READ_WRITE_TOKEN no configurado', 'not_configured');
    }
    return this.token;
  }

  async upload(input: UploadInput): Promise<StorageObject> {
    const token = this.assertConfigurado();
    const storageKey = nuevaClave({
      filename: input.filename,
      contentType: input.contentType,
      prefix: input.prefix,
    });
    const blob = await put(storageKey, input.data, {
      access: input.visibility === 'public' ? 'public' : 'private',
      contentType: input.contentType,
      token,
    });
    return {
      storageKey: blob.pathname,
      size: input.data.byteLength,
      contentType: input.contentType,
      checksum: sha256(input.data),
      visibility: input.visibility,
      publicUrl: input.visibility === 'public' ? blob.url : null,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const token = this.assertConfigurado();
    await del(storageKey, { token });
  }

  async exists(storageKey: string): Promise<boolean> {
    const token = this.assertConfigurado();
    try {
      await head(storageKey, { token });
      return true;
    } catch {
      return false;
    }
  }

  async openReadStream(storageKey: string): Promise<ReadableStream<Uint8Array>> {
    const token = this.assertConfigurado();
    const meta = await head(storageKey, { token }).catch(() => null);
    if (!meta) throw new StorageError(`No existe: ${storageKey}`, 'not_found');
    // El token va en la petición del servidor y nunca llega al navegador.
    const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok || !res.body) {
      throw new StorageError(`Lectura fallida (${res.status})`, 'io_error');
    }
    return res.body;
  }

  getPublicUrl(): string | null {
    // La URL pública de un blob no se puede derivar de la clave: la asigna
    // Vercel al subirlo. Quien la necesite debe haberla guardado.
    return null;
  }
}
