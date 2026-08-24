/**
 * Definiciones puras de los agentes operativos.
 *
 * No importa módulos `server-only`: los seeds también cargan este fichero.
 * Todas las rutinas se siembran desactivadas y solo una activación explícita
 * calcula su primera ventana.
 */

export type OperationAgentScheduleSeed = {
  readonly agentSlug: 'crm-steward' | 'deal-clerk' | 'growth' | 'seo';
  readonly slug: string;
  readonly name: string;
  readonly cronExpression: string;
  readonly timezone: string;
  readonly catchUpPolicy: 'skip' | 'latest' | 'all_limited';
  readonly maxCatchUpRuns: number;
  readonly inputJson: Record<string, unknown>;
};

export const OPERATION_AGENT_SCHEDULES: readonly OperationAgentScheduleSeed[] = [
  {
    agentSlug: 'crm-steward',
    slug: 'crm-steward-daily',
    name: 'Control operativo diario del CRM',
    cronExpression: '0 9 * * *',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'skip',
    maxCatchUpRuns: 1,
    inputJson: { reportKind: 'daily', windowHours: 24 },
  },
  {
    agentSlug: 'crm-steward',
    slug: 'crm-steward-weekly',
    name: 'Revisión semanal de calidad del CRM',
    cronExpression: '30 9 * * 1',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'latest',
    maxCatchUpRuns: 1,
    inputJson: { reportKind: 'weekly', windowHours: 168 },
  },
  {
    agentSlug: 'growth',
    slug: 'growth-inbound-daily',
    name: 'Priorización diaria de leads entrantes',
    cronExpression: '15 9 * * *',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'skip',
    maxCatchUpRuns: 1,
    inputJson: { reportKind: 'inbound-triage', windowHours: 24 },
  },
  {
    agentSlug: 'seo',
    slug: 'seo-weekly-report',
    name: 'Informe SEO semanal',
    cronExpression: '0 10 * * 1',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'latest',
    maxCatchUpRuns: 1,
    inputJson: { reportKind: 'weekly-performance', windowDays: 28 },
  },
  {
    agentSlug: 'seo',
    slug: 'seo-indexing-check',
    name: 'Control diario de indexación',
    cronExpression: '30 10 * * *',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'skip',
    maxCatchUpRuns: 1,
    inputJson: { reportKind: 'indexing', windowDays: 7 },
  },
];

export const OPERATION_AGENT_TOOL_NAMES = {
  'crm-steward': ['getOperationalCampaignSummary'],
  'deal-clerk': ['getDealDraftQueue'],
  growth: ['getInboundLeadQueue'],
  seo: ['getSeoOperationsSnapshot'],
} as const;
