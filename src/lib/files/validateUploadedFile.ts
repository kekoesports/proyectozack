export interface ValidateUploadedFileOptions {
  readonly maxBytes: number;
  readonly allowedMimes: readonly string[];
  readonly allowedExts: readonly string[];
}

export type ValidateUploadedFileResult =
  | { ok: true }
  | { ok: false; reason: string };

const MAGIC_BYTES: Record<string, readonly (readonly number[])[]> = {
  // PDF: %PDF-
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // JPEG: FF D8 FF (followed by E0/E1/...)
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  // WebP: 'RIFF' .... 'WEBP' (relevant for image uploads in some flows)
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx).toLowerCase();
}

function matchesMagic(bytes: Uint8Array, mime: string): boolean {
  const signatures = MAGIC_BYTES[mime];
  if (!signatures) return true; // mime sin firma conocida — saltar check binario
  for (const sig of signatures) {
    if (bytes.length < sig.length) continue;
    let matches = true;
    for (let i = 0; i < sig.length; i++) {
      if (bytes[i] !== sig[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Valida un `File` recibido en upload contra MIME, extensión, tamaño y
 * magic bytes. No intenta abrir o parsear el archivo; solo verifica los
 * primeros bytes contra firmas conocidas (PDF, PNG, JPEG, WebP).
 *
 * Retorna `{ ok: true }` o `{ ok: false; reason }` con `reason` ∈
 * `empty_file | too_large | mime_not_allowed | extension_not_allowed |
 * magic_bytes_mismatch | invalid_file`.
 */
export async function validateUploadedFile(
  file: File,
  opts: ValidateUploadedFileOptions,
): Promise<ValidateUploadedFileResult> {
  if (typeof file.size !== 'number' || typeof file.name !== 'string' || typeof file.type !== 'string') {
    return { ok: false, reason: 'invalid_file' };
  }
  if (file.size <= 0) return { ok: false, reason: 'empty_file' };
  if (file.size > opts.maxBytes) return { ok: false, reason: 'too_large' };
  if (!opts.allowedMimes.includes(file.type)) return { ok: false, reason: 'mime_not_allowed' };

  const ext = getExtension(file.name);
  if (!ext || !opts.allowedExts.includes(ext)) {
    return { ok: false, reason: 'extension_not_allowed' };
  }

  let bytes: Uint8Array;
  try {
    const buf = await file.slice(0, 16).arrayBuffer();
    bytes = new Uint8Array(buf);
  } catch {
    return { ok: false, reason: 'invalid_file' };
  }

  if (!matchesMagic(bytes, file.type)) {
    return { ok: false, reason: 'magic_bytes_mismatch' };
  }
  return { ok: true };
}
