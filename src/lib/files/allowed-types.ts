/**
 * Presets reusables de tipos permitidos para `validateUploadedFile`.
 * Cada preset es un objeto con `mimes`, `exts` y `maxBytes`.
 */

export const PHOTO_TYPES = {
  mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const,
  exts: ['.png', '.jpg', '.jpeg', '.webp', '.gif'] as const,
  maxBytes: 5 * 1024 * 1024,
};

/** GEO stats reports: PDF, imágenes y hojas de cálculo. */
export const GEO_STATS_TYPES = {
  mimes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  exts: ['.pdf', '.png', '.jpg', '.jpeg', '.csv', '.xlsx', '.xls'] as const,
  maxBytes: 25 * 1024 * 1024,
};

/** Archivos polimórficos genéricos (adjuntos varios). */
export const POLY_FILE_TYPES = {
  mimes: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  exts: ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.csv', '.xlsx', '.xls'] as const,
  maxBytes: 25 * 1024 * 1024,
};

/** Contratos: solo PDF. */
export const CONTRACT_PDF_TYPES = {
  mimes: ['application/pdf'] as const,
  exts: ['.pdf'] as const,
  maxBytes: 15 * 1024 * 1024,
};

/** Imports de talents (CSV/XLSX). */
export const TALENT_IMPORT_TYPES = {
  mimes: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  exts: ['.csv', '.xlsx', '.xls'] as const,
  maxBytes: 10 * 1024 * 1024,
};
