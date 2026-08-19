import type { LeadStatus } from '@/types';

export const STATUS_META: Record<LeadStatus, { readonly label: string; readonly color: string }> = {
  nuevo:      { label: 'Nuevo',      color: 'border-sky-500/40 text-sky-400'        },
  contactado: { label: 'Contactado', color: 'border-amber-500/40 text-amber-400'    },
  ganado:     { label: 'Ganado',     color: 'border-emerald-500/40 text-emerald-400' },
  descartado: { label: 'Descartado', color: 'border-zinc-500/40 text-zinc-400'      },
};

export const TYPE_META: Record<string, { readonly label: string; readonly color: string }> = {
  brand:  { label: 'Marca',   color: 'border-sp-orange/50 text-sp-orange'  },
  talent: { label: 'Creador', color: 'border-sp-purple/50 text-sp-purple'  },
  other:  { label: 'Otro',    color: 'border-zinc-500/40 text-zinc-400'    },
};

export function typeMeta(type: string): { readonly label: string; readonly color: string } {
  return TYPE_META[type] ?? { label: type, color: 'border-zinc-500/40 text-zinc-400' };
}

export function isLeadStatus(v: string): v is LeadStatus {
  return v in STATUS_META;
}

/** Fecha corta y estable entre server y cliente (evita hydration mismatch). */
export function shortDate(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}
