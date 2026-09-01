import { z } from 'zod';

import {
  getBankReconciliationSummary,
  getPendingPaymentMatches,
  getSuggestedTransactionMatches,
  getUnmatchedBankTransactions,
} from '@/lib/services/ai-assistant/tools/bankReconciliation';
import {
  getBillingSummary,
  getOverdueInvoices,
  getPendingInvoices,
} from '@/lib/services/ai-assistant/tools/billing';
import { getActiveCampaigns, getCampaignMarginSummary } from '@/lib/services/ai-assistant/tools/campaigns';
import {
  getMonthlyExpenseSummary,
  getRecurringExpensesSummary,
} from '@/lib/services/ai-assistant/tools/expenses';
import {
  getCampaignMarginAlerts,
  getCashflowTrend,
  getFinanceAlerts,
  getFinanceDashboardSummary,
  getReceivablesRiskSummary,
} from '@/lib/services/ai-assistant/tools/financeDashboard';
import { getHelpContextText } from '@/lib/services/ai-assistant/tools/help';
import { getOperationsSummary } from '@/lib/services/ai-assistant/tools/operations';
import { getTalentPerformanceSummary } from '@/lib/services/ai-assistant/tools/talentPerformance';
import { getIpReadinessSummary } from '@/lib/services/ai-assistant/tools/ipReadiness';

import { eraseAgentTool } from '../erase-tool';
import type { ErasedAgentTool } from '../types';
import { defineReadTool, envolver } from './define';

/**
 * Las 17 tools de solo lectura del asistente, envueltas para el runtime nuevo.
 *
 * Envueltas, no reimplementadas: cada una llama exactamente a la misma función
 * que usa `/admin/asistente` hoy. Duplicar las queries daría dos versiones de
 * "cuánto se facturó este mes" que divergirían en la primera corrección.
 *
 * Lo que aporta la envoltura es el contrato del runtime —permiso declarado,
 * clase de acción, timeout, redacción y validación de input—, que en el
 * asistente vive disperso entre `TOOL_ALLOWED_ROLES` y `sanitizeToolOutput`.
 *
 * Los permisos son los mismos que `TOOL_ALLOWED_ROLES` expresaba por rol, pero
 * declarados como módulo + acción para que los resuelva `hasPermission` y no
 * haya una segunda matriz RBAC que mantener en paralelo.
 */

// ── Facturación ──────────────────────────────────────────────────────────────

const FACTURACION = { module: 'facturacion', action: 'read' } as const;
const BANCOS = { module: 'bancos', action: 'read' } as const;
const CAMPANAS = { module: 'campanas', action: 'read' } as const;
const ANALYTICS = { module: 'analytics', action: 'read' } as const;
const AGENTS = { module: 'agents', action: 'read' } as const;
const IP_EVIDENCE = { module: 'ip_evidence', action: 'read' } as const;

export const getBillingSummaryTool = defineReadTool({
  name: 'getBillingSummary',
  description: 'Resumen financiero del mes en curso: ingresos, gastos, neto y facturas pendientes o vencidas.',
  permission: FACTURACION,
  run: () => getBillingSummary(),
});

export const getOverdueInvoicesTool = defineReadTool({
  name: 'getOverdueInvoices',
  description: 'Facturas vencidas sin cobrar.',
  permission: FACTURACION,
  run: () => getOverdueInvoices(),
});

export const getPendingInvoicesTool = defineReadTool({
  name: 'getPendingInvoices',
  description: 'Facturas emitidas pendientes de cobro.',
  permission: FACTURACION,
  run: () => getPendingInvoices(),
});

export const getRecurringExpensesSummaryTool = defineReadTool({
  name: 'getRecurringExpensesSummary',
  description: 'Gastos recurrentes activos: suscripciones y pagos fijos.',
  permission: FACTURACION,
  run: () => getRecurringExpensesSummary(),
});

export const getMonthlyExpenseSummaryTool = defineReadTool({
  name: 'getMonthlyExpenseSummary',
  description: 'Total mensual de gastos recurrentes por categoría.',
  permission: FACTURACION,
  run: () => getMonthlyExpenseSummary(),
});

export const getFinanceDashboardSummaryTool = defineReadTool({
  name: 'getFinanceDashboardSummary',
  description: 'Resumen del dashboard financiero: devengado, caja real del mes y estado de conciliación.',
  permission: FACTURACION,
  run: () => getFinanceDashboardSummary(),
});

export const getReceivablesRiskSummaryTool = defineReadTool({
  name: 'getReceivablesRiskSummary',
  description: 'Cobros pendientes y vencidos agrupados por riesgo.',
  permission: FACTURACION,
  run: () => getReceivablesRiskSummary(),
});

export const getFinanceAlertsTool = defineReadTool({
  name: 'getFinanceAlerts',
  description: 'Alertas financieras derivadas del estado actual del sistema.',
  permission: FACTURACION,
  run: () => getFinanceAlerts(),
});

// ── Conciliación bancaria ────────────────────────────────────────────────────

export const getBankReconciliationSummaryTool = defineReadTool({
  name: 'getBankReconciliationSummary',
  description: 'Resumen de conciliación bancaria: total, sin conciliar, conciliadas y tasa.',
  permission: BANCOS,
  run: () => getBankReconciliationSummary(),
});

export const getUnmatchedBankTransactionsTool = defineReadTool({
  name: 'getUnmatchedBankTransactions',
  description: 'Transacciones bancarias importadas pendientes de conciliar (hasta 25).',
  permission: BANCOS,
  run: () => getUnmatchedBankTransactions(),
});

export const getSuggestedTransactionMatchesTool = defineReadTool({
  name: 'getSuggestedTransactionMatches',
  description: 'Mejor candidato de conciliación por transacción sin conciliar.',
  permission: BANCOS,
  run: () => getSuggestedTransactionMatches(),
});

export const getPendingPaymentMatchesTool = defineReadTool({
  name: 'getPendingPaymentMatches',
  description: 'Transacciones conciliadas cuyo cobro o pago aún no se ha aplicado a la factura.',
  permission: BANCOS,
  run: () => getPendingPaymentMatches(),
});

// ── Campañas ─────────────────────────────────────────────────────────────────

export const getCampaignMarginSummaryTool = defineReadTool({
  name: 'getCampaignMarginSummary',
  description: 'Margen estimado y real de campañas activas y recientes.',
  permission: CAMPANAS,
  run: () => getCampaignMarginSummary(),
});

export const getActiveCampaignsTool = defineReadTool({
  name: 'getActiveCampaigns',
  description: 'Campañas activas y en negociación.',
  permission: CAMPANAS,
  run: () => getActiveCampaigns(),
});

// ── Analytics ────────────────────────────────────────────────────────────────

export const getCashflowTrendTool = defineReadTool({
  name: 'getCashflowTrend',
  description: 'Serie mensual de los últimos 12 meses con cobros reales y gastos devengados.',
  permission: ANALYTICS,
  run: () => getCashflowTrend(),
});

export const getCampaignMarginAlertsTool = defineReadTool({
  name: 'getCampaignMarginAlerts',
  description: 'Campañas con margen estimado inferior al 20 %.',
  permission: ANALYTICS,
  run: () => getCampaignMarginAlerts(),
});

export const getOperationsSummaryTool = defineReadTool({
  name: 'getOperationsSummary',
  description: 'Resumen de Creadores Target, prensa, contenido y copias cifradas para priorizar operaciones.',
  permission: AGENTS,
  run: () => getOperationsSummary(),
});

export const getTalentPerformanceSummaryTool = defineReadTool({
  name: 'getTalentPerformanceSummary',
  description: 'Tendencias de audiencia, cobertura de datos y contenido con mejor rendimiento de los talentos.',
  permission: ANALYTICS,
  run: () => getTalentPerformanceSummary(),
});

export const getIpReadinessSummaryTool = defineReadTool({
  name: 'getIpReadinessSummary',
  description: 'Preparación documental de activos IP, horas, titularidad y huecos pendientes sin emitir conclusiones fiscales.',
  permission: IP_EVIDENCE,
  run: () => getIpReadinessSummary(),
});

// ── Documentación interna ────────────────────────────────────────────────────

const HELP_INPUT = z
  .object({
    /** Módulo del CRM sobre el que se quiere contexto. */
    topic: z.string().max(60).optional(),
  })
  .strict();

type HelpInput = z.infer<typeof HELP_INPUT>;

/**
 * Única tool de este bloque con argumentos, y la única sin permiso de módulo:
 * es documentación interna del CRM, no datos de negocio.
 *
 * `topic` viene del modelo, así que se acota a 60 caracteres y se guarda tal
 * cual en la traza —es lo que hace falta para entender después por qué el
 * agente pidió lo que pidió—.
 */
export const getCrmHelpContextTool: ErasedAgentTool = eraseAgentTool<HelpInput, { readonly text: string }>({
  name: 'getCrmHelpContext',
  version: '1',
  description: 'Documentación interna sobre cómo funciona cada módulo del CRM.',
  inputSchema: HELP_INPUT,
  requiredPermission: null,
  actionClass: 'read',
  approvalPolicy: 'never',
  maxExecutionMs: 5_000,
  redactInput: (input) => ({ topic: input.topic ?? null }),
  redactOutput: (output) => envolver(output),
  buildIdempotencyKey: null,
  execute: async (_ctx, input) => ({ text: getHelpContextText(input.topic) }),
});

/** Las tools, en el orden en que las declara el asistente. */
export const LEGACY_READ_TOOLS: readonly ErasedAgentTool[] = [
  getBillingSummaryTool,
  getOverdueInvoicesTool,
  getPendingInvoicesTool,
  getCampaignMarginSummaryTool,
  getActiveCampaignsTool,
  getRecurringExpensesSummaryTool,
  getMonthlyExpenseSummaryTool,
  getCrmHelpContextTool,
  getBankReconciliationSummaryTool,
  getUnmatchedBankTransactionsTool,
  getSuggestedTransactionMatchesTool,
  getPendingPaymentMatchesTool,
  getFinanceDashboardSummaryTool,
  getCashflowTrendTool,
  getReceivablesRiskSummaryTool,
  getCampaignMarginAlertsTool,
  getFinanceAlertsTool,
  getOperationsSummaryTool,
  getTalentPerformanceSummaryTool,
  getIpReadinessSummaryTool,
];
