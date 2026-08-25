/**
 * Paridad con el asistente actual.
 *
 * Las tools de solo lectura se envuelven, no se reimplementan: cada una
 * llama a la misma función que usa `/admin/asistente` hoy. Este fichero vigila
 * que la lista no se desincronice y, sobre todo, que los permisos declarados
 * como módulo + acción concedan exactamente a los mismos roles que la tabla
 * `TOOL_ALLOWED_ROLES` del asistente.
 *
 * Si alguien añade una tool al asistente y no al runtime —o al revés—, esto
 * falla antes de que las dos versiones empiecen a divergir.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { ROLES, type Role } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/permissions';
import { AGENT_TOOL_ALLOWLISTS, ALL_AGENT_TOOLS, getAgentToolRegistry } from '@/lib/agents/tools';
import { AVAILABLE_TOOLS } from '@/lib/services/ai-assistant/tools';

/**
 * Roles que el asistente permite hoy para cada tool.
 *
 * Copiado a mano del `TOOL_ALLOWED_ROLES` del asistente: es el valor esperado
 * del test, y si se importara del mismo sitio que se está comprobando, el test
 * no comprobaría nada.
 */
const ROLES_ESPERADOS: Readonly<Record<string, readonly Role[]>> = {
  getBillingSummary: ['admin', 'manager', 'finance'],
  getOverdueInvoices: ['admin', 'manager', 'finance'],
  getPendingInvoices: ['admin', 'manager', 'finance'],
  getRecurringExpensesSummary: ['admin', 'manager', 'finance'],
  getMonthlyExpenseSummary: ['admin', 'manager', 'finance'],
  getFinanceDashboardSummary: ['admin', 'manager', 'finance'],
  getReceivablesRiskSummary: ['admin', 'manager', 'finance'],
  getFinanceAlerts: ['admin', 'manager', 'finance'],
  getBankReconciliationSummary: ['admin', 'manager', 'finance'],
  getUnmatchedBankTransactions: ['admin', 'manager', 'finance'],
  getSuggestedTransactionMatches: ['admin', 'manager', 'finance'],
  getPendingPaymentMatches: ['admin', 'manager', 'finance'],
  getCampaignMarginSummary: ['admin', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
  getActiveCampaigns: ['admin', 'manager', 'staff', 'ops', 'talent_manager', 'finance'],
  getCashflowTrend: ['admin', 'manager', 'analyst', 'finance', 'talent_manager'],
  getCampaignMarginAlerts: ['admin', 'manager', 'analyst', 'finance', 'talent_manager'],
  getOperationsSummary: ['admin', 'manager', 'ops', 'analyst', 'finance', 'talent_manager', 'editor'],
};

describe('cobertura de las tools del asistente', () => {
  it('el runtime cubre todas las tools del asistente, sin perder ninguna', () => {
    // Desde PR 6 el registro tiene además las tools propias de Guardian, así
    // que la comprobación es de cobertura y no de igualdad. El invariante que
    // importa sigue siendo el mismo: si alguien añade una tool al asistente y
    // no al runtime, esto falla antes de que las dos versiones divergan.
    const enRuntime = new Set(ALL_AGENT_TOOLS.map((t) => t.name));
    for (const nombre of AVAILABLE_TOOLS) {
      expect(enRuntime.has(nombre)).toBe(true);
    }
    expect(AVAILABLE_TOOLS).toHaveLength(18);
  });

  it('las tools añadidas son las de Guardian y ninguna más', () => {
    const extras = ALL_AGENT_TOOLS.map((t) => t.name).filter(
      (n) => !(AVAILABLE_TOOLS as readonly string[]).includes(n),
    );
    expect(extras.sort()).toEqual([
      'getAgentQueueHealth',
      'getAgentWorkerHealth',
      'getDealDraftQueue',
      'getInboundLeadQueue',
      'getOpenOperationalIncidents',
      'getOperationalCampaignSummary',
      'getSeoOperationsSnapshot',
      'getSystemHealthSnapshot',
    ]);
  });

  it('todas se declaran como lectura y sin aprobación', () => {
    for (const tool of ALL_AGENT_TOOLS) {
      expect(tool.actionClass).toBe('read');
      expect(tool.approvalPolicy).toBe('never');
    }
  });

  it('todas tienen timeout y descripción', () => {
    for (const tool of ALL_AGENT_TOOLS) {
      expect(tool.maxExecutionMs).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });
});

describe('paridad de permisos', () => {
  it('cada tool concede a los mismos roles que el asistente', () => {
    for (const [nombre, esperados] of Object.entries(ROLES_ESPERADOS)) {
      const tool = ALL_AGENT_TOOLS.find((t) => t.name === nombre);
      expect(tool).toBeDefined();
      const permiso = tool?.requiredPermission;
      expect(permiso).not.toBeNull();
      if (!permiso) continue;

      const concedidos = ROLES.filter((r) => hasPermission(r, permiso.module, permiso.action));

      // `admin_limited_tasks` es posterior al mapa del asistente y lo hereda de
      // los permisos del CRM; se excluye de la comparación en vez de fingir que
      // el asistente ya lo contemplaba.
      const sinLimited = concedidos.filter((r) => r !== 'admin_limited_tasks');
      expect([...sinLimited].sort()).toEqual([...esperados].sort());
    }
  });

  it('getCrmHelpContext sigue sin exigir permiso de módulo', () => {
    // Es documentación interna del CRM, no datos de negocio.
    const help = ALL_AGENT_TOOLS.find((t) => t.name === 'getCrmHelpContext');
    expect(help?.requiredPermission).toBeNull();
  });

  it('ninguna tool concede acceso a un rol externo', () => {
    for (const tool of ALL_AGENT_TOOLS) {
      if (!tool.requiredPermission) continue;
      expect(hasPermission('brand', tool.requiredPermission.module, tool.requiredPermission.action)).toBe(false);
    }
  });
});

describe('allowlists por agente', () => {
  const registro = getAgentToolRegistry();

  it('los seis agentes del catálogo tienen allowlist', () => {
    expect(Object.keys(AGENT_TOOL_ALLOWLISTS).sort()).toEqual(
      ['crm-steward', 'deal-clerk', 'dev', 'growth', 'guardian', 'seo'].sort(),
    );
  });

  it('un agente no alcanza una tool que no está en su lista', () => {
    expect(registro.isAllowedForAgent('guardian', 'getBillingSummary')).toBe(false);
    expect(registro.isAllowedForAgent('guardian', 'getCrmHelpContext')).toBe(true);
  });

  it('un agente inexistente no alcanza nada', () => {
    expect(registro.isAllowedForAgent('inventado', 'getCrmHelpContext')).toBe(false);
  });

  it('ningún agente alcanza las tools de conciliación bancaria en esta fase', () => {
    for (const slug of Object.keys(AGENT_TOOL_ALLOWLISTS)) {
      expect(registro.isAllowedForAgent(slug, 'getUnmatchedBankTransactions')).toBe(false);
      expect(registro.isAllowedForAgent(slug, 'getPendingPaymentMatches')).toBe(false);
    }
  });

  it('toda tool citada en una allowlist existe', () => {
    for (const nombres of Object.values(AGENT_TOOL_ALLOWLISTS)) {
      for (const nombre of nombres) {
        expect(registro.has(nombre)).toBe(true);
      }
    }
  });
});

describe('registro', () => {
  it('rechaza tools duplicadas', () => {
    const primera = ALL_AGENT_TOOLS[0];
    expect(primera).toBeDefined();
    if (!primera) return;
    const { AgentToolRegistry } = jest.requireActual<typeof import('@/lib/agents/tool-registry')>(
      '@/lib/agents/tool-registry',
    );
    expect(() => new AgentToolRegistry([primera, primera], {})).toThrow(/duplicada/);
  });

  it('rechaza una allowlist que cita una tool inexistente', () => {
    const { AgentToolRegistry } = jest.requireActual<typeof import('@/lib/agents/tool-registry')>(
      '@/lib/agents/tool-registry',
    );
    expect(() => new AgentToolRegistry([], { guardian: ['noExiste'] })).toThrow(/no existe/);
  });

  it('el registro compartido es el mismo objeto en todo el proceso', () => {
    expect(getAgentToolRegistry()).toBe(getAgentToolRegistry());
  });
});
