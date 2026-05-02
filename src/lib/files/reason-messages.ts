import type { ValidateUploadedFileReason } from './validateUploadedFile';

const MESSAGES: Record<ValidateUploadedFileReason, string> = {
  invalid_file: 'Archivo inválido',
  empty_file: 'Archivo vacío',
  too_large: 'El archivo supera el tamaño máximo permitido',
  mime_not_allowed: 'Tipo de archivo no permitido',
  extension_not_allowed: 'Extensión no permitida',
  magic_bytes_mismatch: 'El contenido no coincide con el tipo declarado',
};

export function uploadReasonMessage(reason: ValidateUploadedFileReason): string {
  return MESSAGES[reason];
}
