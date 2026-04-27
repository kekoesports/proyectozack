'use client';

import type { DiffRow } from '@/lib/utils/statsImport';

export const BTN_PRIMARY = 'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
export const BTN_GHOST = 'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

export const STATUS_LABELS: Record<DiffRow['status'], string> = {
  'new': 'Nuevo',
  'updated': 'Actualizar',
  'unchanged': 'Sin cambios',
  'no-talent-match': 'Talent no encontrado',
  'no-social-match': 'Sin red',
};

export const STATUS_STYLES: Record<DiffRow['status'], string> = {
  'new': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'updated': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'unchanged': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'no-talent-match': 'bg-red-500/15 text-red-400 border-red-500/30',
  'no-social-match': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export type ImportResult = {
  readonly success?: boolean;
  readonly error?: string;
  readonly applied?: number;
  readonly created?: number;
  readonly updated?: number;
  readonly skipped?: number;
};
