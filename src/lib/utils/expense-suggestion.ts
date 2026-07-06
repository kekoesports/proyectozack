/**
 * Reglas de categorización asistida de gastos por concepto/proveedor.
 *
 * IMPORTANTE:
 *   - Solo se sugiere, NUNCA se aplica automáticamente.
 *   - Solo usa subtypes que ya existen en el enum `expense_subtype`.
 *   - El operador confirma la clasificación con las Server Actions
 *     `classifyExpensesAction` / `updateExpenseClassificationAction`
 *     (ambas gated por `facturacion:write`).
 *
 * Ampliar reglas: añadir entradas al array `RULES`. No requiere migración.
 * Añadir subtypes nuevos SÍ requiere migración de enum — hoy fuera de scope.
 */

import type { ExpenseGroupValue, ExpenseSubtypeValue } from '@/lib/schemas/invoice';

export interface ExpenseSuggestion {
  readonly expenseGroup: ExpenseGroupValue;
  readonly expenseSubtype: ExpenseSubtypeValue;
  /** Palabra clave que disparó la regla — útil para explicar al operador. */
  readonly matchedKeyword: string;
}

interface Rule {
  readonly keywords: readonly string[];
  readonly group: ExpenseGroupValue;
  readonly subtype: ExpenseSubtypeValue;
}

/**
 * Reglas ordenadas por prioridad (primer match gana). Case-insensitive.
 * Todos los subtypes referenciados EXISTEN en el enum actual.
 */
const RULES: readonly Rule[] = [
  // Pagos a talentos — prioridad máxima porque el prefijo suele ser único.
  { keywords: ['pago talento', 'pago a talento', 'pago talent'], group: 'campaign_direct', subtype: 'pago_talento' },
  { keywords: ['talento'], group: 'campaign_direct', subtype: 'pago_talento' },

  // Producción / comisión — solo cuando aparecen los términos.
  { keywords: ['producción', 'produccion', 'edición', 'edicion', 'diseño para campaña'], group: 'campaign_direct', subtype: 'coste_produccion' },
  { keywords: ['comisión plataforma', 'comision plataforma', 'plataforma comisión'], group: 'campaign_direct', subtype: 'comision_plataforma' },

  // Nóminas / socios
  { keywords: ['nómina', 'nomina', 'nomina socio'], group: 'operational', subtype: 'nomina_socio' },

  // Impuestos / seguridad social
  { keywords: ['seguridad social', 'tesorería seguridad', 'tesoreria seguridad', 'tgss'], group: 'operational', subtype: 'seguridad_social' },
  { keywords: ['cuota autónomo', 'cuota autonomo', 'autónomo', 'autonomo'], group: 'operational', subtype: 'cuota_autonomo' },
  { keywords: ['factura autónomo', 'factura autonomo'], group: 'operational', subtype: 'factura_autonomo' },
  { keywords: ['irpf', 'iva trimestral', 'modelo 303', 'modelo 111', 'impuesto'], group: 'operational', subtype: 'fiscal_impuestos' },
  { keywords: ['ajuste fiscal', 'regularización fiscal', 'regularizacion fiscal'], group: 'operational', subtype: 'ajuste_fiscal' },

  // Gestoría
  { keywords: ['gestoría', 'gestoria', 'asesoría', 'asesoria'], group: 'operational', subtype: 'gestoria' },

  // Seguros
  { keywords: ['seguro médico', 'seguro medico', 'sanitas', 'adeslas', 'mapfre médico'], group: 'operational', subtype: 'seguro_medico' },

  // Software / infra
  { keywords: ['google workspace', 'gsuite', 'g suite'], group: 'operational', subtype: 'suscripcion_software' },
  { keywords: ['adobe', 'creative cloud', 'photoshop', 'illustrator', 'premiere'], group: 'operational', subtype: 'suscripcion_software' },
  { keywords: ['canva'], group: 'operational', subtype: 'suscripcion_software' },
  { keywords: ['figma', 'notion', 'slack', 'jira', 'linear'], group: 'operational', subtype: 'suscripcion_software' },
  { keywords: ['vercel', 'neon', 'aws', 'gcp', 'azure', 'cloudflare', 'digitalocean'], group: 'operational', subtype: 'suscripcion_software' },
  { keywords: ['chatgpt', 'openai', 'anthropic', 'claude api', 'gemini api', 'midjourney', 'runway'], group: 'operational', subtype: 'herramienta_ia' },

  // Comisiones bancarias
  { keywords: ['stripe', 'wise', 'paypal', 'revolut', 'bizum'], group: 'operational', subtype: 'comision_bancaria' },
  { keywords: ['comisión banco', 'comision banco', 'comisión bancaria', 'comision bancaria'], group: 'operational', subtype: 'comision_bancaria' },

  // Marketing / publicidad
  { keywords: ['google ads', 'meta ads', 'facebook ads', 'linkedin ads', 'tiktok ads', 'publicidad', 'campaña publicitaria'], group: 'operational', subtype: 'marketing_publicidad' },
];

/**
 * Sugerencia por concepto + proveedor. Devuelve `null` si no hay match.
 * NUNCA se aplica automáticamente — el operador confirma con la Server
 * Action correspondiente.
 */
export function suggestExpenseCategorization(input: {
  readonly concept: string | null;
  readonly counterpartyName: string | null;
}): ExpenseSuggestion | null {
  const haystack = [input.concept ?? '', input.counterpartyName ?? '']
    .join(' ')
    .toLowerCase();
  if (!haystack.trim()) return null;

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        return {
          expenseGroup: rule.group,
          expenseSubtype: rule.subtype,
          matchedKeyword: kw,
        };
      }
    }
  }
  return null;
}
