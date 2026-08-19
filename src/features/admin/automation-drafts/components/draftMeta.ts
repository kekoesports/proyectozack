/**
 * Metadatos de presentación de los borradores de trato que llegan por automatización.
 *
 * Los estados los escribe `src/lib/queries/automationDealDrafts.ts`; aquí sólo se
 * traducen a etiqueta y color. `varchar` en DB, no enum, así que se trata como
 * string abierto y se degrada con elegancia ante un valor desconocido.
 */

export const DRAFT_STATUSES = [
  'missing_info',
  'pending_review',
  'created',
  'rejected',
] as const;

export type DraftStatus = (typeof DRAFT_STATUSES)[number];

type Meta = { readonly label: string; readonly color: string };

export const STATUS_META: Record<DraftStatus, Meta> = {
  missing_info: { label: 'Faltan datos', color: 'border-amber-500/40 text-amber-400' },
  pending_review: { label: 'Por revisar', color: 'border-sky-500/40 text-sky-400' },
  created: { label: 'Aprobado', color: 'border-emerald-500/40 text-emerald-400' },
  rejected: { label: 'Rechazado', color: 'border-zinc-500/40 text-zinc-400' },
};

const UNKNOWN_META: Meta = { label: 'Desconocido', color: 'border-zinc-500/40 text-zinc-400' };

export function statusMeta(status: string): Meta {
  return isDraftStatus(status) ? STATUS_META[status] : { ...UNKNOWN_META, label: status };
}

export function isDraftStatus(value: string): value is DraftStatus {
  return (DRAFT_STATUSES as readonly string[]).includes(value);
}

export const SOURCE_META: Record<string, Meta> = {
  discord: { label: 'Discord', color: 'border-sp-purple/50 text-sp-purple' },
  manual: { label: 'Manual', color: 'border-zinc-500/40 text-zinc-400' },
  api: { label: 'API', color: 'border-sp-blue/50 text-sp-blue' },
};

export function sourceMeta(source: string): Meta {
  return SOURCE_META[source] ?? { label: source, color: 'border-zinc-500/40 text-zinc-400' };
}

/** Un borrador sólo se puede aprobar o rechazar mientras no se haya resuelto. */
export function isActionable(status: string): boolean {
  return status === 'pending_review' || status === 'missing_info';
}

export function shortDateTime(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}

/**
 * `missingFields` viene con rutas Zod (`talent.handle`, `deliverables.0.type`).
 * Para el CRM basta el campo de primer nivel, sin duplicados.
 */
export function topLevelMissing(fields: readonly string[]): readonly string[] {
  return Array.from(new Set(fields.map((f) => f.split('.')[0] ?? f)));
}
