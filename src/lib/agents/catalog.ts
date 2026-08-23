/**
 * Catálogo de los seis agentes de Zack Agent OS.
 *
 * Es dato puro, sin dependencias: lo consume el seed
 * (`scripts/seed-agent-definitions.ts`) y lo verifican los tests sin necesidad
 * de base de datos.
 *
 * Ninguna entrada trae `status` ni `mode`: los fija el seed a partir de las
 * constantes de abajo, iguales para todos. Un agente nace apagado y en shadow,
 * y sacarlo de ahí es una decisión humana, nunca un efecto colateral de
 * desplegar.
 *
 * Ver docs/agent-os/agents-tools-policies.md.
 */

/** Todo agente sembrado nace con el kill switch echado. */
export const SEED_AGENT_STATUS = 'disabled' as const;
/** Y en shadow: razona y deja traza, pero no escribe ni notifica. */
export const SEED_AGENT_MODE = 'shadow' as const;

export type AgentCatalogEntry = {
  readonly slug: string;
  readonly displayName: string;
  readonly description: string;
  readonly promptVersion: string;
  readonly policyVersion: string;
  /** `null` = NullProvider. Solo Guardian puede usar modelo durante rollout. */
  readonly modelProvider: 'null' | 'gemini';
  readonly modelName: string | null;
  readonly maxConcurrentRuns: number;
  readonly maxRunsPerDay: number;
  readonly maxTurnsPerRun: number;
  readonly maxToolCallsPerRun: number;
  readonly maxDurationSeconds: number;
  /** 1 USD = 1.000.000 micros. */
  readonly monthlyBudgetMicros: number;
  /**
   * Rol con el que se ejecuta cuando no hay un humano detrás.
   *
   * Un run de rutina necesita un rol para que el RBAC del CRM decida y no puede
   * heredarlo de nadie. Sin esto el default es `analyst`, que basta para
   * lecturas de analytics y poco más: un agente cuyas tools exijan otro permiso
   * vería **todas** sus llamadas denegadas, produciría informes vacíos para
   * siempre, y la causa no saldría por ninguna parte — la timeline solo diría
   * `blocked` y al modelo se le dice únicamente "no tienes permiso".
   *
   * Se escribe en `settings_json`. `admin`, `admin_limited_tasks` y `brand`
   * están prohibidos: un agente que se ejecuta sin supervisión no opera como
   * administrador.
   */
  readonly systemRole?: 'manager' | 'staff' | 'ops' | 'editor' | 'finance' | 'analyst' | 'talent_manager';
};

export const AGENT_CATALOG: readonly AgentCatalogEntry[] = [
  {
    slug: 'guardian',
    displayName: 'Zack Guardian',
    description:
      'Vigila infraestructura, backups, n8n y CI. Detecta de forma determinista; el modelo solo interpreta y prioriza.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'gemini',
    modelName: 'gemini-2.5-flash',
    maxConcurrentRuns: 1,
    maxRunsPerDay: 48,
    maxTurnsPerRun: 6,
    maxToolCallsPerRun: 12,
    maxDurationSeconds: 300,
    monthlyBudgetMicros: 2_000_000,
    // Sus tools piden `infrastructure:read`, que `analyst` no tiene. Con el
    // default, cada llamada acabaría en `policy_denied` y el informe saldría
    // vacío sin que nada dijera por qué.
    systemRole: 'ops',
  },
  {
    slug: 'crm-steward',
    displayName: 'Zack CRM Steward',
    description:
      'Detecta tratos bloqueados, datos incompletos y tareas vencidas. Propone; no corrige el CRM por su cuenta.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'null',
    modelName: null,
    maxConcurrentRuns: 1,
    maxRunsPerDay: 12,
    maxTurnsPerRun: 8,
    maxToolCallsPerRun: 16,
    maxDurationSeconds: 600,
    monthlyBudgetMicros: 2_000_000,
  },
  {
    slug: 'deal-clerk',
    displayName: 'Zack Deal Clerk',
    description:
      'Interpreta peticiones de trato y prepara borradores idempotentes para revisión humana.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'null',
    modelName: null,
    maxConcurrentRuns: 1,
    maxRunsPerDay: 24,
    maxTurnsPerRun: 8,
    maxToolCallsPerRun: 16,
    maxDurationSeconds: 600,
    monthlyBudgetMicros: 2_000_000,
  },
  {
    slug: 'growth',
    displayName: 'Zack Growth',
    description:
      'Detecta, enriquece y puntúa leads, y redacta outreach. Nada sale de la casa sin aprobación.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'null',
    modelName: null,
    maxConcurrentRuns: 1,
    maxRunsPerDay: 12,
    maxTurnsPerRun: 10,
    maxToolCallsPerRun: 20,
    maxDurationSeconds: 900,
    monthlyBudgetMicros: 2_000_000,
  },
  {
    slug: 'seo',
    displayName: 'Zack SEO',
    description:
      'Analiza Search Console y Analytics y prepara briefs editoriales. No publica.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'null',
    modelName: null,
    maxConcurrentRuns: 1,
    maxRunsPerDay: 8,
    maxTurnsPerRun: 10,
    maxToolCallsPerRun: 20,
    maxDurationSeconds: 900,
    monthlyBudgetMicros: 2_000_000,
  },
  {
    slug: 'dev',
    displayName: 'Zack Dev',
    description:
      'Resume CI, errores y releases. Solo lectura: propone incidencias, no las abre.',
    promptVersion: 'v0',
    policyVersion: 'v0',
    modelProvider: 'null',
    modelName: null,
    maxConcurrentRuns: 1,
    maxRunsPerDay: 12,
    maxTurnsPerRun: 8,
    maxToolCallsPerRun: 16,
    maxDurationSeconds: 600,
    monthlyBudgetMicros: 2_000_000,
  },
];

export const AGENT_SLUGS = AGENT_CATALOG.map((a) => a.slug);
