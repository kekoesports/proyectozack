/**
 * Interfaz de almacenamiento de ficheros.
 *
 * Existe para que la aplicación deje de hablar directamente con Vercel Blob y
 * pueda escribir en el disco del VPS sin reescribir cada llamada. Durante la
 * migración conviven los dos proveedores: se escribe en el nuevo y se sigue
 * leyendo del viejo cuando el fichero solo está allí. Esa convivencia es lo que
 * permite volver atrás sin perder nada.
 */

/** Un fichero público se sirve por URL; uno privado solo por ruta autenticada. */
export type StorageVisibility = 'public' | 'private';

export type StorageObject = {
  /**
   * Identificador lógico y estable del fichero dentro del almacenamiento.
   *
   * Es lo que se guarda en base de datos, NO una ruta absoluta del servidor:
   * una ruta ata los datos a la máquina y al punto de montaje de hoy.
   */
  readonly storageKey: string;
  readonly size: number;
  readonly contentType: string;
  /** SHA-256 del contenido, para verificar copias e integridad. */
  readonly checksum: string;
  readonly visibility: StorageVisibility;
  /**
   * URL pública, si la hay. Los privados devuelven null a propósito: su acceso
   * pasa siempre por una ruta que comprueba permisos.
   */
  readonly publicUrl: string | null;
};

export type UploadInput = {
  /** Nombre propuesto. Se usa para la extensión y como pista, nunca como ruta. */
  readonly filename: string;
  readonly data: Buffer;
  readonly contentType: string;
  readonly visibility: StorageVisibility;
  /** Carpeta lógica: 'invoices', 'contracts', 'talents'… */
  readonly prefix?: string | undefined;
};

export interface StorageProvider {
  readonly name: 'vercel' | 'local';
  upload(input: UploadInput): Promise<StorageObject>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  openReadStream(storageKey: string): Promise<ReadableStream<Uint8Array>>;
  /** URL pública o null si el objeto es privado o el proveedor no las sirve. */
  getPublicUrl(storageKey: string): string | null;
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'invalid_key' | 'too_large' | 'io_error' | 'not_configured',
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
