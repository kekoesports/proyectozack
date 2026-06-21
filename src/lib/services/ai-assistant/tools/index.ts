'server-only';

import { logToolExecution } from '@/lib/queries/aiAssistant';
import { logRedacted } from '@/lib/log';
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
  | 'getPendingPaymentMatches';

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
] as const satisfies readonly ToolName[];

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
}): Promise<ToolResult> {
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

Para usarlas, incluye en tu respuesta una línea con el formato:
[TOOL:nombreDeLaTool]
o si necesitas parámetro:
[TOOL:nombreDeLaTool:{"topic":"facturacion"}]

Las herramientas devuelven datos reales del sistema. Analízalos y presenta la información de forma clara y útil al usuario.
`.trim();
