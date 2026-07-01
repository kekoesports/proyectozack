/**
 * Helpers puros para el resumen económico V2. Sin dependencias de DB ni
 * server-only. Testeable con fixtures.
 *
 * Toda la lógica de clasificación por subtype, split Pablo/Alfonso y
 * agregación de KPIs vive aquí. La query (`finanzasResumenV2.ts`) trae los
 * raw rows y llama a estos helpers.
 */

import { detectPartner } from './expenseSubgroups';
import type {
  FinanzasResumenImpuestos,
  FinanzasResumenNominas,
  FinanzasResumenOperativos,
  FinanzasResumenPendienteBucket,
  FinanzasResumenPendientes,
  FinanzasResumenResultado,
  PendienteItem,
} from '@/types/finanzasResumen';

// ── Fila de gasto que entra al helper (sin importar cómo se obtuvo) ─────────

export type ExpenseRow = {
  readonly totalAmount: number;
  readonly expenseGroup: string | null;
  readonly expenseSubtype: string | null;
  readonly concept: string | null;
  readonly counterpartyName: string | null;
};

// ── Rondeo consistente ─────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Clasificación por sección del resumen ───────────────────────────────────

export type ResumenSection = 'nominas' | 'impuestos' | 'operativos' | 'costes_directos';

const IMPUESTOS_SUBTYPES: ReadonlySet<string> = new Set([
  'cuota_autonomo',
  'factura_autonomo',
  'seguridad_social',
  'fiscal_impuestos',
  'ajuste_fiscal',
]);

/**
 * Devuelve la sección del resumen a la que pertenece una fila.
 *
 * - `nominas`         → `expenseSubtype = 'nomina_socio'`
 * - `impuestos`       → subtypes en `IMPUESTOS_SUBTYPES`
 * - `costes_directos` → `expenseGroup = 'campaign_direct'`
 * - `operativos`      → resto (incluye `expenseGroup = 'operational'` sin
 *                       subtype conocido y filas sin clasificar)
 */
export function classifyResumenSection(row: {
  readonly expenseGroup: string | null;
  readonly expenseSubtype: string | null;
}): ResumenSection {
  const subtype = row.expenseSubtype;
  if (subtype === 'nomina_socio') return 'nominas';
  if (subtype && IMPUESTOS_SUBTYPES.has(subtype)) return 'impuestos';
  if (row.expenseGroup === 'campaign_direct') return 'costes_directos';
  return 'operativos';
}

// ── Agregación de nóminas ───────────────────────────────────────────────────

export function aggregateNominas(rows: readonly ExpenseRow[]): FinanzasResumenNominas {
  let pablo = 0, alfonso = 0, otros = 0, count = 0;
  for (const r of rows) {
    if (r.expenseSubtype !== 'nomina_socio') continue;
    count += 1;
    const partner = detectPartner(`${r.concept ?? ''} ${r.counterpartyName ?? ''}`);
    if (partner === 'pablo') pablo += r.totalAmount;
    else if (partner === 'alfonso') alfonso += r.totalAmount;
    else otros += r.totalAmount;
  }
  return {
    pablo: round2(pablo),
    alfonso: round2(alfonso),
    otros: round2(otros),
    total: round2(pablo + alfonso + otros),
    count,
  };
}

// ── Agregación de impuestos ─────────────────────────────────────────────────

export function aggregateImpuestos(rows: readonly ExpenseRow[]): FinanzasResumenImpuestos {
  let cuotaPablo = 0, cuotaAlfonso = 0, cuotaOtros = 0;
  let seguridadSocial = 0, fiscal = 0, count = 0;

  for (const r of rows) {
    const st = r.expenseSubtype;
    if (!st || !IMPUESTOS_SUBTYPES.has(st)) continue;
    count += 1;
    if (st === 'seguridad_social') {
      seguridadSocial += r.totalAmount;
    } else if (st === 'fiscal_impuestos' || st === 'ajuste_fiscal') {
      fiscal += r.totalAmount;
    } else {
      // cuota_autonomo | factura_autonomo → split Pablo/Alfonso
      const partner = detectPartner(`${r.concept ?? ''} ${r.counterpartyName ?? ''}`);
      if (partner === 'pablo') cuotaPablo += r.totalAmount;
      else if (partner === 'alfonso') cuotaAlfonso += r.totalAmount;
      else cuotaOtros += r.totalAmount;
    }
  }

  return {
    cuotaAutonomoPablo:   round2(cuotaPablo),
    cuotaAutonomoAlfonso: round2(cuotaAlfonso),
    cuotaAutonomoOtros:   round2(cuotaOtros),
    seguridadSocial:      round2(seguridadSocial),
    fiscal:               round2(fiscal),
    total: round2(cuotaPablo + cuotaAlfonso + cuotaOtros + seguridadSocial + fiscal),
    count,
  };
}

// ── Agregación de gastos operativos ─────────────────────────────────────────

const HOSTING_RE = /\b(hosting|dominio|domain|vercel|cloudflare|namecheap|godaddy|dns|ssl)\b/i;
const HOSTING_CANDIDATE_SUBTYPES: ReadonlySet<string | null> = new Set([
  'suscripcion_software',
  'herramienta_ia',
  'gasto_general',
  null,
]);

function isHostingRow(row: ExpenseRow): boolean {
  if (!HOSTING_CANDIDATE_SUBTYPES.has(row.expenseSubtype)) return false;
  const text = `${row.concept ?? ''} ${row.counterpartyName ?? ''}`;
  return HOSTING_RE.test(text);
}

export function aggregateOperativos(rows: readonly ExpenseRow[]): FinanzasResumenOperativos {
  let gestoria = 0, softwareIa = 0, hostingDominio = 0;
  let seguroMedico = 0, comisiones = 0, marketing = 0;
  let otros = 0, sinClasificar = 0, count = 0;

  for (const r of rows) {
    if (classifyResumenSection(r) !== 'operativos') continue;
    count += 1;

    // Detectar hosting antes del switch canónico (mismo criterio que
    // expenseSubgroups.classifyExpenseSubgroup).
    if (isHostingRow(r)) {
      hostingDominio += r.totalAmount;
      continue;
    }

    switch (r.expenseSubtype) {
      case 'gestoria':
        gestoria += r.totalAmount; break;
      case 'suscripcion_software':
      case 'herramienta_ia':
        softwareIa += r.totalAmount; break;
      case 'seguro_medico':
        seguroMedico += r.totalAmount; break;
      case 'comision_bancaria':
      case 'comision_plataforma':
        comisiones += r.totalAmount; break;
      case 'marketing_publicidad':
        marketing += r.totalAmount; break;
      case 'gasto_general':
        otros += r.totalAmount; break;
      default:
        if (r.expenseSubtype === null && r.expenseGroup === null) {
          sinClasificar += r.totalAmount;
        } else {
          otros += r.totalAmount;
        }
    }
  }

  return {
    gestoria:       round2(gestoria),
    softwareIa:     round2(softwareIa),
    hostingDominio: round2(hostingDominio),
    seguroMedico:   round2(seguroMedico),
    comisiones:     round2(comisiones),
    marketing:      round2(marketing),
    otros:          round2(otros),
    sinClasificar:  round2(sinClasificar),
    total: round2(gestoria + softwareIa + hostingDominio + seguroMedico + comisiones + marketing + otros + sinClasificar),
    count,
  };
}

// ── Resultado operativo ─────────────────────────────────────────────────────

export function computeResultadoOperativo(input: {
  readonly margenBrutoCobrado: number;
  readonly nominasTotal:       number;
  readonly impuestosTotal:     number;
  readonly operativosTotal:    number;
}): FinanzasResumenResultado {
  return {
    operativo: round2(
      input.margenBrutoCobrado - input.nominasTotal - input.impuestosTotal - input.operativosTotal,
    ),
  };
}

// ── Días vencidos ──────────────────────────────────────────────────────────

export function daysOverdue(today: string, dueDate: string | null): number | null {
  if (!dueDate) return null;
  const [ya, ma, da] = today.split('-').map(Number);
  const [yb, mb, db] = dueDate.split('-').map(Number);
  if (!ya || !ma || !da || !yb || !mb || !db) return null;
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86_400_000);
}

// ── Top-N pendientes ────────────────────────────────────────────────────────

export function topNPendientes(items: readonly PendienteItem[], n = 5): FinanzasResumenPendienteBucket {
  const total = items.reduce((s, i) => s + i.amount, 0);
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  return {
    total: round2(total),
    count: items.length,
    top: sorted.slice(0, n),
  };
}

// ── Margen pendiente estimado ───────────────────────────────────────────────

export function computeMargenPendienteEstimado(
  cobrosCampanasTotal: number,
  pagosTalentoTotal: number,
): number {
  return round2(cobrosCampanasTotal - pagosTalentoTotal);
}

// ── Ensamblado de pendientes ────────────────────────────────────────────────

export function assemblePendientes(input: {
  readonly cobrosCampanas: readonly PendienteItem[];
  readonly pagosTalento:   readonly PendienteItem[];
  readonly pagosOperativo: readonly PendienteItem[];
}): FinanzasResumenPendientes {
  const cobrosCampanas = topNPendientes(input.cobrosCampanas);
  const pagosTalento   = topNPendientes(input.pagosTalento);
  const pagosOperativo = topNPendientes(input.pagosOperativo);
  return {
    cobrosCampanas,
    pagosTalento,
    pagosOperativo,
    margenPendienteEstimado: computeMargenPendienteEstimado(
      cobrosCampanas.total,
      pagosTalento.total,
    ),
  };
}
