'server-only';

import { logToolExecution } from '@/lib/queries/aiAssistant';
import { logRedacted } from '@/lib/log';
import type { Role } from '@/lib/auth-guard';
import { getBillingSummary, getOverdueInvoices, getPendingInvoices } from './billing';
import { getCampaignMarginSummary, getActiveCampaigns } from './campaigns';
import { getMonthlyExpenseSummary, getRecurringExpensesSummary } from './expenses';
import { getHelpContextText } from './help';
import {
  getBankReconciliationSummary,
  getUnmatchedBankTransactions,
  getSuggestedTransactionMatches,
  getPendingPaymentMatches,
} from './bankReconciliation';
import {
  getFinanceDashboardSummary,
  getCashflowTrend,
  getReceivablesRiskSummary,
  getCampaignMarginAlerts,
  getFinanceAlerts,
} from './financeDashboard';

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export type ToolName =
  | 'getBillingSummary'
  | 'getOverdueInvoices'
  | 'getPendingInvoices'
  | 'getCampaignMarginSummary'
  | 'getActiveCampaigns'
  | 'getRecurringExpensesSummary'
  | 'getMonthlyExpenseSummary'
  | 'getCrmHelpContext'
  | 'getBankReconciliationSummary'
  | 'getUnmatchedBankTransactions'
  | 'getSuggestedTransactionMatches'
  | 'getPendingPaymentMatches'
  | 'getFinanceDashboardSummary'
  | 'getCashflowTrend'
  | 'getReceivablesRiskSummary'
  | 'getCampaignMarginAlerts'
  | 'getFinanceAlerts';

export const AVAILABLE_TOOLS = [
  'getBillingSummary',
  'getOverdueInvoices',
  'getPendingInvoices',
  'getCampaignMarginSummary',
  'getActiveCampaigns',
  'getRecurringExpensesSummary',
  'getMonthlyExpenseSummary',
  'getCrmHelpContext',
  'getBankReconciliationSummary',
  'getUnmatchedBankTransactions',
  'getSuggestedTransactionMatches',
  'getPendingPaymentMatches',
  'getFinanceDashboardSummary',
  'getCashflowTrend',
  'getReceivablesRiskSummary',
  'getCampaignMarginAlerts',
  'getFinanceAlerts',
] as const satisfies readonly ToolName[];

// Mapa de roles permitidos por tool.
// Si una tool no aparece aquí, está disponible para todos los roles autenticados.
// Espeja exactamente los permisos de src/lib/permissions.ts para consistencia.
const TOOL_ALLOWED_ROLES: Partial<Record<ToolName, readonly Role[]>> = {
  // facturacion:read — admin, manager, finance únicamente
  getBillingSummary:           ['admin', 'manager', 'finance'],
  getOverdueInvoices:          ['admin', 'manager', 'finance'],
  getPendingInvoices:          ['admin', 'manager', 'finance'],
  getRecurringExpensesSummary: ['admin', 'manager', 'finance'],
  getMonthlyExpenseSummary:    ['admin', 'manager', 'finance'],
  getFinanceDashboardSummary:  ['admin', 'manager', 'finance'],
  getReceivablesRiskSummary:   ['admin', 'manager', 'finance'],
  getFinanceAlerts:            ['admin', 'manager', 'finance'],
  // bancos:read — admin, manager, finance únicamente
  getBankReconciliationSummary:   ['admin', 'manager', 'finance'],
  getUnmatchedBankTransactions:   ['admin', 'manager', 'finance'],
  getSuggestedTransactionMatches: ['admin', 'manager', 'finance'],
  getPendingPaymentMatches:       ['admin', 'manager', 'finance'],
  // campanas:read — incluye ops y talent_manager
  getCampaignMarginSummary: ['admin', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
  getActiveCampaigns:       ['admin', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
  // analytics:read — incluye analyst y talent_manager (datos agregados sin PII ni importes individuales)
  getCashflowTrend:        ['admin', 'manager', 'analyst', 'finance', 'talent_manager'],
  getCampaignMarginAlerts: ['admin', 'manager', 'analyst', 'finance', 'talent_manager'],
  // getCrmHelpContext: sin restricción — disponible para todos los roles autenticados
};

async function executeTool(name: ToolName, input?: unknown): Promise<ToolResult> {
  try {
    switch (name) {
      case 'getBillingSummary':
        return { ok: true, data: await getBillingSummary() };
      case 'getOverdueInvoices':
        return { ok: true, data: await getOverdueInvoices() };
      case 'getPendingInvoices':
        return { ok: true, data: await getPendingInvoices() };
      case 'getCampaignMarginSummary':
        return { ok: true, data: await getCampaignMarginSummary() };
      case 'getActiveCampaigns':
        return { ok: true, data: await getActiveCampaigns() };
      case 'getRecurringExpensesSummary':
        return { ok: true, data: await getRecurringExpensesSummary() };
      case 'getMonthlyExpenseSummary':
        return { ok: true, data: await getMonthlyExpenseSummary() };
      case 'getCrmHelpContext': {
        const topic = typeof input === 'object' && input !== null && 'topic' in input
          ? String((input as Record<string, unknown>).topic ?? '')
          : undefined;
        return { ok: true, data: { text: getHelpContextText(topic) } };
      }
      case 'getBankReconciliationSummary':
        return { ok: true, data: await getBankReconciliationSummary() };
      case 'getUnmatchedBankTransactions':
        return { ok: true, data: await getUnmatchedBankTransactions() };
      case 'getSuggestedTransactionMatches':
        return { ok: true, data: await getSuggestedTransactionMatches() };
      case 'getPendingPaymentMatches':
        return { ok: true, data: await getPendingPaymentMatches() };
      case 'getFinanceDashboardSummary':
        return { ok: true, data: await getFinanceDashboardSummary() };
      case 'getCashflowTrend':
        return { ok: true, data: await getCashflowTrend() };
      case 'getReceivablesRiskSummary':
        return { ok: true, data: await getReceivablesRiskSummary() };
      case 'getCampaignMarginAlerts':
        return { ok: true, data: await getCampaignMarginAlerts() };
      case 'getFinanceAlerts':
        return { ok: true, data: await getFinanceAlerts() };
      default:
        return { ok: false, error: `Tool desconocida: ${name as string}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRedacted('error', `[ai-tools] Error en ${name}:`, msg);
    return { ok: false, error: msg };
  }
}

export async function runTool(opts: {
  name: ToolName;
  input?: unknown;
  threadId: number;
  messageId?: number;
  userRole: Role;
}): Promise<ToolResult> {
  const allowedRoles = TOOL_ALLOWED_ROLES[opts.name];
  if (allowedRoles && !(allowedRoles as readonly string[]).includes(opts.userRole)) {
    try {
      await logToolExecution({ threadId: opts.threadId, toolName: opts.name, status: 'blocked', errorMessage: 'insufficient-role' });
    } catch { /* best effort */ }
    return { ok: false, error: 'Acceso denegado: tu rol no tiene permiso para esta herramienta.' };
  }

  const result = await executeTool(opts.name, opts.input);

  // Loggear ejecución — best effort, no bloquea el flujo si falla
  try {
    await logToolExecution({
      threadId: opts.threadId,
      toolName: opts.name,
      status: result.ok ? 'success' : 'error',
      outputJson: result.ok ? result.data : { error: result.error },
      ...(opts.messageId !== undefined ? { messageId: opts.messageId } : {}),
      ...(opts.input !== undefined ? { inputJson: opts.input } : {}),
      ...(!result.ok ? { errorMessage: result.error } : {}),
    });
  } catch (logErr) {
    logRedacted('warn', '[ai-tools] Failed to log tool execution:', logErr);
  }

  return result;
}

// Descripción de tools para incluir en el system prompt
export const TOOLS_DESCRIPTION = `
Tienes acceso a las siguientes herramientas de solo lectura del CRM SocialPro:

- getBillingSummary: resumen financiero del mes actual (ingresos, gastos, neto, facturas pendientes/vencidas)
- getOverdueInvoices: lista facturas vencidas sin cobrar
- getPendingInvoices: lista facturas emitidas pendientes de cobro
- getCampaignMarginSummary: margen estimado y real de campañas activas y recientes
- getActiveCampaigns: campañas activas y en negociación
- getRecurringExpensesSummary: gastos recurrentes activos (suscripciones, pagos fijos)
- getMonthlyExpenseSummary: total mensual de gastos recurrentes por categoría
- getCrmHelpContext: documentación interna sobre cómo funciona cada módulo del CRM
- getBankReconciliationSummary: resumen global de conciliación bancaria (total, sin conciliar, conciliadas, pendientes revisión, tasa de conciliación)
- getUnmatchedBankTransactions: lista hasta 25 transacciones bancarias importadas pendientes de conciliar
- getSuggestedTransactionMatches: top candidato de conciliación por transacción sin conciliar (hasta 25)
- getPendingPaymentMatches: transacciones conciliadas (aprobadas) cuyo cobro/pago aún no ha sido aplicado a la factura
- getFinanceDashboardSummary: resumen completo del dashboard financiero (accrual, cash real del mes, estado conciliación bancaria)
- getCashflowTrend: serie mensual de los últimos 12 meses con cobros reales (cash) y gastos facturados (devengado)
- getReceivablesRiskSummary: cobros pendientes y vencidos agrupados por riesgo (importe total, top 5 vencidos)
- getCampaignMarginAlerts: campañas con margen inferior al 20% (presupuesto estimado)
- getFinanceAlerts: alertas financieras derivadas automáticamente del estado actual del sistema

Para usarlas, incluye en tu respuesta una línea con el formato:
[TOOL:nombreDeLaTool]
o si necesitas parámetro:
[TOOL:nombreDeLaTool:{"topic":"facturacion"}]

Las herramientas devuelven datos reales del sistema. Analízalos y presenta la información de forma clara y útil al usuario.
`.trim();
