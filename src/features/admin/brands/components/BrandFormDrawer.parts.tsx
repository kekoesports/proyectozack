import type { CrmBrandStatus } from '@/types';

export const STATUS_LABELS: Record<CrmBrandStatus, string> = {
  lead: 'Lead',
  contactada: 'Contactada',
  en_negociacion: 'En negociación',
  activa: 'Activa',
  inactiva: 'Inactiva',
  perdida: 'Perdida',
  pausada: 'Pausada',
  cerrada: 'Cerrada',
  no_interesa: 'No interesa',
  archivada: 'Archivada',
};

export const TIPO_LABELS: Record<string, string> = {
  agencia: 'Agencia',
  marca: 'Marca',
};

export const INPUT = 'w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
export const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
export const BTN_PRIMARY = 'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
export const BTN_GHOST = 'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';
export const BTN_DANGER = 'px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors cursor-pointer';

export function toDateInputValue(val: Date | string | null | undefined): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
