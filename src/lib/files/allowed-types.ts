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
  maxBytes: 20 * 1024 * 1024,
};

/** Documentos de factura/justificante: PDF + imágenes (cap 10 MB). */
export const INVOICE_DOC_TYPES = {
  mimes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const,
  exts: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] as const,
  maxBytes: 10 * 1024 * 1024,
};

/** Imports de facturas (PDF/XLSX/CSV/XML). */
export const INVOICE_IMPORT_TYPES = {
  mimes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/xml',
    'text/xml',
  ] as const,
  exts: ['.pdf', '.xlsx', '.xls', '.csv', '.xml'] as const,
  maxBytes: 10 * 1024 * 1024,
};

/** Imports de extractos bancarios (CSV/XLSX). */
export const BANK_IMPORT_TYPES = {
  mimes: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  exts: ['.csv', '.xlsx', '.xls'] as const,
  maxBytes: 6 * 1024 * 1024,
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
