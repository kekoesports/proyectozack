/**
 * Helpers para la media library de noticias.
 *
 * Storage: Vercel Blob con prefijo `news/`, access público (CDN-served).
 *
 * Token strategy:
 *   - Lee `BLOB_READ_WRITE_TOKEN_NEWS` si existe (store dedicado público).
 *   - Si no, cae a `BLOB_READ_WRITE_TOKEN` (el de facturas/contratos).
 *
 * Si el token apunta a un store privado, `put({ access: 'public' })` falla
 * con "Cannot use public access on a private store". En ese caso, crear
 * un Blob store nuevo en Vercel Dashboard → Storage → tipo Public, copiar
 * el token y setear `BLOB_READ_WRITE_TOKEN_NEWS` en Vercel + .env.local.
 *
 * Procesado: sharp resize a max 1536px width + WebP q82. Asegura covers
 * <250KB tras compresión, match 3:2 del article cover container.
 */
import { list, put, del } from '@vercel/blob';
import sharp from 'sharp';
import { env } from '@/lib/env';

const PREFIX = 'news/';
const MAX_WIDTH = 1536;
const WEBP_QUALITY = 82;
const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10MB raw upload limit

export type NewsImage = {
  readonly url: string;
  readonly pathname: string;
  readonly filename: string;
  readonly uploadedAt: Date;
  readonly size: number;
};

function getToken(): string | undefined {
  return env.BLOB_READ_WRITE_TOKEN_NEWS ?? env.BLOB_READ_WRITE_TOKEN;
}

function sanitizeFilename(input: string): string {
  const withoutExt = input.replace(/\.[^.]+$/, '');
  return withoutExt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function listNewsImages(): Promise<NewsImage[]> {
  const token = getToken();
  if (!token) return [];
  const { blobs } = await list({ prefix: PREFIX, token });
  return blobs
    .map((b) => ({
      url: b.url,
      pathname: b.pathname,
      filename: b.pathname.replace(PREFIX, ''),
      uploadedAt: b.uploadedAt,
      size: b.size,
    }))
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export type UploadResult =
  | { readonly ok: true; readonly image: NewsImage }
  | { readonly ok: false; readonly error: string };

export async function uploadNewsImage(
  file: File,
  customSlug?: string,
): Promise<UploadResult> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado. Ver Vercel Dashboard → Storage.' };
  }

  if (file.size > MAX_RAW_BYTES) {
    return { ok: false, error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 10MB.` };
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: `Tipo de archivo no soportado: ${file.type}. Solo imágenes.` };
  }

  const originalBuf = Buffer.from(await file.arrayBuffer());
  let processed: Buffer;
  try {
    processed = await sharp(originalBuf)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (e) {
    return { ok: false, error: `Procesado falló: ${e instanceof Error ? e.message : String(e)}` };
  }

  const baseSlug = customSlug?.trim() ? sanitizeFilename(customSlug) : sanitizeFilename(file.name);
  if (!baseSlug) return { ok: false, error: 'Nombre de archivo inválido tras sanitización.' };
  const key = `${PREFIX}${baseSlug}.webp`;

  try {
    const result = await put(key, processed, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    return {
      ok: true,
      image: {
        url: result.url,
        pathname: key,
        filename: `${baseSlug}.webp`,
        uploadedAt: new Date(),
        size: processed.length,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('private store')) {
      return {
        ok: false,
        error:
          'El Blob store actual es privado. Crear un store nuevo público en Vercel Dashboard → Storage → New Store → Public, y setear BLOB_READ_WRITE_TOKEN_NEWS con el token resultante.',
      };
    }
    return { ok: false, error: `Upload Blob falló: ${msg}` };
  }
}

export async function deleteNewsImage(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = getToken();
  if (!token) return { ok: false, error: 'BLOB_READ_WRITE_TOKEN no configurado.' };
  try {
    await del(url, { token });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
