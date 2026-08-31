import { GUARDIAN_ALLOWLIST } from '../guardian/definition';
import { GUARDIAN_TOOLS } from '../guardian/tools';
import { OPERATION_AGENT_TOOL_NAMES } from '../operations/definition';
import { OPERATION_AGENT_TOOLS } from '../operations/tools';
import { AgentToolRegistry } from '../tool-registry';
import { LEGACY_READ_TOOLS } from './legacy-read-adapter';

export * from './define';
export * from './legacy-read-adapter';

/**
 * Allowlist por agente.
 *
 * Fail-closed: un agente que no aparezca aquí no alcanza ninguna tool, y una
 * tool registrada pero no listada tampoco. Estar en el registro no autoriza;
 * el registro solo dice qué existe.
 *
 * Reparto deliberadamente estrecho en esta fase. Guardian, Growth, SEO y Dev
 * solo tienen documentación interna porque sus tools propias llegan en PRs
 * posteriores, y darles acceso a finanzas "por si acaso" sería exactamente el
 * error que la allowlist existe para impedir.
 *
 * Las tools financieras están asignadas a `crm-steward` y `deal-clerk` porque
 * son los agentes que trabajan sobre campañas y tratos. Que aparezcan aquí no
 * significa que sus datos vayan a leerse: el permiso se comprueba contra el
 * rol REAL del actor, así que una ejecución disparada por un `staff` no verá
 * facturación aunque la tool esté en la lista. Dos capas, y la de abajo es la
 * del CRM.
 */
export const AGENT_TOOL_ALLOWLISTS: Readonly<Record<string, readonly string[]>> = {
  guardian: GUARDIAN_ALLOWLIST,
  'crm-steward': [
    ...OPERATION_AGENT_TOOL_NAMES['crm-steward'],
    'getCrmHelpContext',
    'getActiveCampaigns',
    'getCampaignMarginSummary',
    'getCampaignMarginAlerts',
    'getFinanceAlerts',
    'getFinanceDashboardSummary',
    'getOperationsSummary',
    'getTalentPerformanceSummary',
  ],
  'deal-clerk': [
    ...OPERATION_AGENT_TOOL_NAMES['deal-clerk'],
    'getCrmHelpContext',
    'getActiveCampaigns',
  ],
  growth: [...OPERATION_AGENT_TOOL_NAMES.growth, 'getCrmHelpContext', 'getOperationsSummary', 'getTalentPerformanceSummary'],
  seo: [...OPERATION_AGENT_TOOL_NAMES.seo, 'getCrmHelpContext'],
  dev: ['getCrmHelpContext'],
};

/** Todas las tools registradas del runtime. */
export const ALL_AGENT_TOOLS = [...LEGACY_READ_TOOLS, ...GUARDIAN_TOOLS, ...OPERATION_AGENT_TOOLS];

let registroCompartido: AgentToolRegistry | null = null;

/**
 * Registro compartido del proceso.
 *
 * Se construye una vez y se congela. Que sea un singleton no es una
 * optimización: es lo que garantiza que no exista un segundo registro con
 * tools distintas al que alguien pudiera llegar por otro camino.
 */
export function getAgentToolRegistry(): AgentToolRegistry {
  registroCompartido ??= new AgentToolRegistry(ALL_AGENT_TOOLS, AGENT_TOOL_ALLOWLISTS);
  return registroCompartido;
}

/** Solo para tests: permite construir un registro con otro contenido. */
export function buildAgentToolRegistry(
  tools: readonly (typeof ALL_AGENT_TOOLS)[number][],
  allowlists: Readonly<Record<string, readonly string[]>>,
): AgentToolRegistry {
  return new AgentToolRegistry(tools, allowlists);
}
