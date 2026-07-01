/**
 * Lógica pura del AR Aging — clasificación de cobros pendientes por antigüedad.
 *
 * Sin dependencias de @/lib/db ni de 'server-only' para permitir tests unitarios
 * y consumo desde Client Components si hiciera falta.
 *
 * La query con DB vive en `arAging.ts` (server-only) y usa estas funciones.
 */

import {
  AR_AGING_BUCKET_ORDER,
  type ArAgingBucket,
  type ArAgingBucketKey,
  type ArAgingFilters,
  type ArAgingKpis,
  type ArAgingRow,
} from '@/types/arAging';

// ── Zona horaria canónica ───────────────────────────────────────────────────

/**
 * Fecha actual en formato ISO YYYY-MM-DD en Europe/Madrid.
 * Aislado como función para poder mockear en tests inyectando un `today` fijo.
 */
export function todayInMadrid(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}

// ── Fechas: fallback dueDate y diff de días ─────────────────────────────────

/**
 * Suma `days` días a un ISO date `YYYY-MM-DD` y devuelve otro ISO date.
 * Usa Date UTC para evitar drift por horario de verano.
 */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const utc = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Diferencia en días enteros entre dos ISO dates (`today - dueDate`).
 * Positivo = vencida hace N días; 0 = vence hoy; negativo = vence en N días.
 */
export function diffDaysIso(from: string, to: string): number {
  const [ya, ma, da] = from.split('-').map(Number);
  const [yb, mb, db] = to.split('-').map(Number);
  if (!ya || !ma || !da || !yb || !mb || !db) return 0;
  const a = Date.UTC(ya, ma - 1, da);
  const b = Date.UTC(yb, mb - 1, db);
  return Math.round((a - b) / 86_400_000);
}

/**
 * Devuelve `effectiveDueDate` e `isEstimatedDueDate` aplicando fallback
 * `issueDate + 30 días` cuando no hay dueDate real.
 */
export function resolveEffectiveDueDate(
  issueDate: string,
  dueDate: string | null,
): { effectiveDueDate: string; isEstimatedDueDate: boolean } {
  if (dueDate) {
    return { effectiveDueDate: dueDate, isEstimatedDueDate: false };
  }
  return { effectiveDueDate: addDaysIso(issueDate, 30), isEstimatedDueDate: true };
}

// ── Clasificación por bucket ────────────────────────────────────────────────

/**
 * Devuelve el bucket de aging para un `daysOverdue` dado.
 *
 * daysOverdue < 0        → 'por_vencer'
 * daysOverdue 0..30      → '0-30'
 * daysOverdue 31..60     → '31-60'
 * daysOverdue 61..90     → '61-90'
 * daysOverdue > 90       → '+90'
 */
export function classifyBucket(daysOverdue: number): ArAgingBucketKey {
  if (daysOverdue < 0) return 'por_vencer';
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '+90';
}

// ── Cálculo de pendiente ────────────────────────────────────────────────────

const CENT = 0.005;

/**
 * `pending = MAX(0, total - paid)` con corte de ruido por debajo de medio céntimo.
 * Nunca devuelve negativo (protege contra sobrepagos en DB).
 */
export function calcPending(total: number, paid: number): number {
  const raw = Math.round((total - paid) * 100) / 100;
  if (raw < CENT) return 0;
  return raw;
}

// ── Estado visible en UI (label humano, no status raw) ──────────────────────

/**
 * Devuelve el label visible que la UI debe pintar para un status crudo.
 * Nunca debe mostrarse el status raw en la vista de cobros.
 */
export function humanStatusLabel(status: string, bucket: ArAgingBucketKey): string {
  if (bucket !== 'por_vencer') return 'Vencida';
  switch (status) {
    case 'parcial':
      return 'Pagada parcial';
    case 'vencida':
      return 'Vencida';
    case 'emitida':
    case 'no_cobrada':
    case 'pendiente':
    default:
      return 'Pendiente';
  }
}

// ── Filtrado en memoria ─────────────────────────────────────────────────────

/**
 * Aplica filtros al array de rows. Cada filtro es opcional; si no está
 * definido, no restringe. La combinación es AND.
 */
export function applyArAgingFilters(
  rows: readonly ArAgingRow[],
  filters: ArAgingFilters,
): readonly ArAgingRow[] {
  return rows.filter((r) => {
    if (filters.bucket && r.bucket !== filters.bucket) return false;
    if (filters.entity && r.entity !== filters.entity) return false;
    if (filters.brand && r.brandName !== filters.brand) return false;
    if (filters.source && r.source !== filters.source) return false;
    return true;
  });
}

// ── Agregaciones: buckets + KPIs ────────────────────────────────────────────

/**
 * Suma importes y cuentas por bucket. El % se calcula sobre el total pendiente.
 * Devuelve los 5 buckets siempre en orden canónico (aunque estén a 0).
 */
export function summarizeBuckets(rows: readonly ArAgingRow[]): readonly ArAgingBucket[] {
  const totalPending = rows.reduce((s, r) => s + r.pendingAmount, 0);
  const map = new Map<ArAgingBucketKey, { amount: number; count: number }>();
  for (const k of AR_AGING_BUCKET_ORDER) map.set(k, { amount: 0, count: 0 });
  for (const r of rows) {
    const b = map.get(r.bucket);
    if (!b) continue;
    b.amount += r.pendingAmount;
    b.count += 1;
  }
  return AR_AGING_BUCKET_ORDER.map((key) => {
    const b = map.get(key) ?? { amount: 0, count: 0 };
    const pct = totalPending > 0 ? (b.amount / totalPending) * 100 : 0;
    return { key, amount: b.amount, count: b.count, pct };
  });
}

/**
 * KPIs para las tarjetas superiores. Todos los importes son suma de `pendingAmount`.
 *
 * - `totalPending`      = sum de todos los rows filtrados
 * - `totalOverdue`      = sum donde bucket != por_vencer
 * - `overdueCount`      = count donde bucket != por_vencer
 * - `pendingNotYetDue`  = sum donde bucket = por_vencer
 * - `avgDaysOverdue`    = promedio de daysOverdue solo entre vencidas; null si no hay
 * - `topDebtorBrand`    = marca con mayor pending sumado; null si no hay marcas
 */
export function computeKpis(rows: readonly ArAgingRow[]): ArAgingKpis {
  let totalPending = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  let pendingNotYetDue = 0;
  let overdueDaysSum = 0;

  const brandTotals = new Map<string, number>();

  for (const r of rows) {
    totalPending += r.pendingAmount;
    if (r.bucket === 'por_vencer') {
      pendingNotYetDue += r.pendingAmount;
    } else {
      totalOverdue += r.pendingAmount;
      overdueCount += 1;
      overdueDaysSum += r.daysOverdue;
    }
    if (r.brandName) {
      brandTotals.set(r.brandName, (brandTotals.get(r.brandName) ?? 0) + r.pendingAmount);
    }
  }

  let topDebtorBrand: ArAgingKpis['topDebtorBrand'] = null;
  for (const [name, amount] of brandTotals) {
    if (!topDebtorBrand || amount > topDebtorBrand.amount) {
      topDebtorBrand = { name, amount };
    }
  }

  return {
    totalPending: round2(totalPending),
    totalOverdue: round2(totalOverdue),
    overdueCount,
    pendingNotYetDue: round2(pendingNotYetDue),
    avgDaysOverdue: overdueCount > 0 ? Math.round(overdueDaysSum / overdueCount) : null,
    topDebtorBrand: topDebtorBrand
      ? { name: topDebtorBrand.name, amount: round2(topDebtorBrand.amount) }
      : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Orden final ─────────────────────────────────────────────────────────────

/**
 * Orden por defecto: más vencidas primero (effectiveDueDate ASC),
 * y a igualdad de fecha, mayor importe arriba.
 */
export function sortByAgingPriority(rows: readonly ArAgingRow[]): readonly ArAgingRow[] {
  return [...rows].sort((a, b) => {
    if (a.effectiveDueDate !== b.effectiveDueDate) {
      return a.effectiveDueDate < b.effectiveDueDate ? -1 : 1;
    }
    return b.pendingAmount - a.pendingAmount;
  });
}
