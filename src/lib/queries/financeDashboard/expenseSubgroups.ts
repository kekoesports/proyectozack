/**
 * Clasificador puro de gastos en subgrupos visuales para dirección.
 *
 * Convierte cada fila de `invoices kind=expense` en un `ExpenseSubgroupKey`
 * con label humano listo para pintar. No accede a DB ni depende de server-only.
 *
 * Se consume desde `pnlDetail.ts` (server) durante la agregación y desde
 * `AnnualExpenseBreakdown.tsx` (RSC) para mostrar los labels.
 */

// ── Tipos y constantes públicas ─────────────────────────────────────────────

export type ExpenseSubgroupKey =
  | 'nomina_pablo'
  | 'nomina_alfonso'
  | 'nomina_otros'
  | 'cuota_pablo'
  | 'cuota_alfonso'
  | 'cuota_otros'
  | 'seguridad_social'
  | 'software_ia'
  | 'hosting_dominio'
  | 'gestoria'
  | 'fiscal'
  | 'marketing'
  | 'comisiones'
  | 'pagos_talentos'
  | 'campana_otros'
  | 'seguro_medico'
  | 'gasto_general'
  | 'sin_clasificar';

export const EXPENSE_SUBGROUP_LABELS: Readonly<Record<ExpenseSubgroupKey, string>> = {
  nomina_pablo:      'Nóminas Pablo',
  nomina_alfonso:    'Nóminas Alfonso',
  nomina_otros:      'Nóminas (sin identificar)',
  cuota_pablo:       'Cuota autónomo Pablo',
  cuota_alfonso:     'Cuota autónomo Alfonso',
  cuota_otros:       'Cuota autónomo (sin identificar)',
  seguridad_social:  'Seguridad Social',
  software_ia:       'Software / IA',
  hosting_dominio:   'Hosting / dominio',
  gestoria:          'Gestoría',
  fiscal:            'Fiscal / impuestos',
  marketing:         'Marketing',
  comisiones:        'Comisiones bancarias',
  pagos_talentos:    'Pagos a talentos',
  campana_otros:     'Costes campaña',
  seguro_medico:     'Seguro médico',
  gasto_general:     'Gasto general',
  sin_clasificar:    'Sin clasificar',
} as const;

export type ExpenseClassifierInput = {
  readonly expenseGroup: string | null;
  readonly expenseSubtype: string | null;
  readonly concept: string | null;
  readonly counterpartyName: string | null;
};

// ── Detección de socio ──────────────────────────────────────────────────────

const PABLO_RE   = /\b(pablo|camacho|keko)\b/i;
const ALFONSO_RE = /\b(alfonso|arias)\b/i;

/**
 * Detecta a Pablo o Alfonso en un texto libre combinado (concept + counterparty).
 * Devuelve `null` si:
 *   - no hay señal;
 *   - hay señal de ambos (ambiguo) → conservador, cae a "sin identificar".
 */
export function detectPartner(text: string): 'pablo' | 'alfonso' | null {
  const p = PABLO_RE.test(text);
  const a = ALFONSO_RE.test(text);
  if (p && !a) return 'pablo';
  if (a && !p) return 'alfonso';
  return null;
}

/**
 * Subtipos donde SÍ tiene sentido separar por socio (nómina + cuota autónomo).
 * NO incluye `pago_talento`: los pagos a talentos externos nunca deben
 * clasificarse como nómina propia aunque coincida un nombre.
 */
const PARTNER_AWARE_SUBTYPES: ReadonlySet<string> = new Set([
  'nomina_socio',
  'cuota_autonomo',
  'factura_autonomo',
]);

// ── Detección de hosting / dominio ──────────────────────────────────────────

const HOSTING_RE = /\b(hosting|dominio|domain|vercel|cloudflare|namecheap|godaddy|dns|ssl)\b/i;

/**
 * Subtipos donde puede aparecer un gasto de hosting/dominio "escondido":
 * software, herramienta IA, gasto general o filas sin subtipo asignado.
 *
 * NO incluye `pago_talento`, `marketing_publicidad` u otros — evita reclasificar
 * pagos a talentos o campañas patrocinadas que casualmente mencionen a Vercel.
 */
const HOSTING_CANDIDATE_SUBTYPES: ReadonlySet<string | null> = new Set([
  'suscripcion_software',
  'herramienta_ia',
  'gasto_general',
  null,
]);

function looksLikeHosting(input: ExpenseClassifierInput): boolean {
  if (!HOSTING_CANDIDATE_SUBTYPES.has(input.expenseSubtype)) return false;
  const text = [input.concept ?? '', input.counterpartyName ?? ''].join(' ');
  return HOSTING_RE.test(text);
}

// ── Clasificador ────────────────────────────────────────────────────────────

/**
 * Clasifica una fila de gasto en su subgrupo visual.
 *
 * Reglas (aplicadas en orden):
 *   1. Si es nómina o cuota autónomo → detecta socio en `concept + counterparty`.
 *   2. Si es candidato a hosting/dominio → hosting_dominio.
 *   3. `expenseSubtype` mapea al subgrupo canónico.
 *   4. Fallback: `expenseGroup` decide entre `campana_otros` (campaign_direct)
 *      y `sin_clasificar` (operational o null).
 */
export function classifyExpenseSubgroup(input: ExpenseClassifierInput): ExpenseSubgroupKey {
  const subtype = input.expenseSubtype;
  const group = input.expenseGroup;

  // Detección de socio SOLO en subtipos donde tiene sentido.
  if (subtype && PARTNER_AWARE_SUBTYPES.has(subtype)) {
    const text = [input.concept ?? '', input.counterpartyName ?? '']
      .filter((s) => s.length > 0)
      .join(' ');
    const partner = detectPartner(text);
    if (subtype === 'nomina_socio') {
      if (partner === 'pablo') return 'nomina_pablo';
      if (partner === 'alfonso') return 'nomina_alfonso';
      return 'nomina_otros';
    }
    // cuota_autonomo + factura_autonomo se agrupan como "Cuota autónomo"
    if (partner === 'pablo') return 'cuota_pablo';
    if (partner === 'alfonso') return 'cuota_alfonso';
    return 'cuota_otros';
  }

  // Hosting / dominio (solo dentro de subtipos candidatos).
  if (looksLikeHosting(input)) return 'hosting_dominio';

  // Mapeo directo por subtipo.
  switch (subtype) {
    case 'seguridad_social':      return 'seguridad_social';
    case 'suscripcion_software':  return 'software_ia';
    case 'herramienta_ia':        return 'software_ia';
    case 'gestoria':              return 'gestoria';
    case 'fiscal_impuestos':      return 'fiscal';
    case 'ajuste_fiscal':         return 'fiscal';
    case 'marketing_publicidad':  return 'marketing';
    case 'comision_bancaria':     return 'comisiones';
    case 'comision_plataforma':   return 'comisiones';
    case 'pago_talento':          return 'pagos_talentos';
    case 'coste_produccion':      return 'campana_otros';
    case 'otros_campana':         return 'campana_otros';
    case 'seguro_medico':         return 'seguro_medico';
    case 'gasto_general':         return 'gasto_general';
  }

  // Sin subtipo → decide el grupo.
  if (group === 'campaign_direct') return 'campana_otros';
  return 'sin_clasificar';
}

// ── Items dentro de cada subgrupo ───────────────────────────────────────────

/**
 * Item concreto (una factura de gasto) dentro de un subgrupo.
 *
 * `pdfUrl` es SIEMPRE una ruta interna al proxy admin, nunca una URL
 * directa al Blob privado.
 */
export type ExpenseSubgroupItem = {
  readonly id: number;
  readonly issueDate: string;
  readonly concept: string;
  readonly counterpartyName: string | null;
  readonly totalAmount: number;
  readonly status: string;
  readonly pdfUrl: string | null;
};

/**
 * Construye la URL del proxy interno del PDF de una factura interna.
 * Devuelve `null` si la factura no tiene ni `invoiceFileId` ni `fileUrl` legacy.
 *
 * IMPORTANTE: nunca se retorna la URL directa del Blob (privacidad).
 */
export function buildInvoicePdfUrl(input: {
  readonly id: number;
  readonly invoiceFileId: number | null;
  readonly fileUrl: string | null;
}): string | null {
  if (input.invoiceFileId === null && (input.fileUrl === null || input.fileUrl.length === 0)) {
    return null;
  }
  return `/api/admin/facturacion/${input.id}/pdf`;
}

// ── Agregación ──────────────────────────────────────────────────────────────

export type ExpenseSubgroupRow = {
  readonly key: ExpenseSubgroupKey;
  readonly label: string;
  readonly amount: number;
  readonly count: number;
  readonly pct: number;
  readonly items: readonly ExpenseSubgroupItem[];
};

export type ExpenseSubgroupAggregate = {
  readonly amount: number;
  readonly count: number;
  readonly items: readonly ExpenseSubgroupItem[];
};

/**
 * Convierte un mapa acumulado de subgrupos en un array ordenado DESC por importe.
 * `pct` se calcula sobre el total pasado como parámetro; si total <= 0, pct = 0
 * (evita `NaN%` en la UI).
 *
 * Los items de cada subgrupo se ordenan por `issueDate ASC` (enero, feb, mar…).
 */
export function summarizeExpenseSubgroups(
  aggregate: ReadonlyMap<ExpenseSubgroupKey, ExpenseSubgroupAggregate>,
  totalExpense: number,
): readonly ExpenseSubgroupRow[] {
  const rows: ExpenseSubgroupRow[] = [];
  for (const [key, v] of aggregate) {
    if (v.count === 0) continue;
    const pct = totalExpense > 0 ? (v.amount / totalExpense) * 100 : 0;
    const sortedItems = [...v.items].sort((a, b) => {
      if (a.issueDate !== b.issueDate) return a.issueDate < b.issueDate ? -1 : 1;
      return a.id - b.id;
    });
    rows.push({
      key,
      label: EXPENSE_SUBGROUP_LABELS[key],
      amount: round2(v.amount),
      count: v.count,
      pct: round1(pct),
      items: sortedItems,
    });
  }
  rows.sort((a, b) => b.amount - a.amount);
  return rows;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
