import { GUARDIAN_PROMPT_VERSION } from './prompt';
import { GUARDIAN_TOOL_NAMES } from './tools';

/**
 * Configuración de Guardian.
 *
 * El agente ya existe en la base desde el seed de PR 1, en `disabled` y
 * `shadow`. Esto no lo activa: define qué tools alcanza, con qué rutinas
 * contará y qué versiones de prompt y política usa.
 *
 * **Las rutinas se siembran desactivadas.** Activar `guardian-daily` es lo que
 * convierte a Guardian en algo que actúa solo, y esa es una decisión con nombre
 * y fecha, no un efecto de desplegar.
 */

export const GUARDIAN_SLUG = 'guardian';
export const GUARDIAN_POLICY_VERSION = 'guardian-policy-v1';

/** Tools que alcanza. Todas de lectura; ninguna toca la infraestructura. */
export const GUARDIAN_ALLOWLIST: readonly string[] = [...GUARDIAN_TOOL_NAMES, 'getCrmHelpContext'];

export type GuardianScheduleSeed = {
  readonly slug: string;
  readonly name: string;
  readonly cronExpression: string;
  readonly timezone: string;
  readonly catchUpPolicy: 'skip' | 'latest' | 'all_limited';
  readonly maxCatchUpRuns: number;
  readonly inputJson: Record<string, unknown>;
};

/**
 * Rutinas de Guardian, para sembrar **desactivadas**.
 *
 * `catchUpPolicy: 'skip'` en la diaria: un informe de infraestructura de
 * anteayer no le sirve a nadie, y recuperar tres días de golpe gastaría
 * presupuesto en decir lo que ya no es cierto.
 */
export const GUARDIAN_SCHEDULES: readonly GuardianScheduleSeed[] = [
  {
    slug: 'guardian-daily',
    name: 'Informe diario de infraestructura',
    cronExpression: '30 8 * * *',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'skip',
    maxCatchUpRuns: 1,
    inputJson: { windowHours: 24, reportKind: 'daily' },
  },
  {
    slug: 'guardian-weekly-capacity',
    name: 'Revisión semanal de capacidad',
    cronExpression: '0 9 * * 1',
    timezone: 'Europe/Madrid',
    // La semanal sí recupera la última ventana: una revisión de capacidad de
    // hace dos días sigue siendo útil.
    catchUpPolicy: 'latest',
    maxCatchUpRuns: 1,
    inputJson: { windowHours: 168, reportKind: 'weekly-capacity' },
  },
];

export const GUARDIAN_DEFINITION = {
  slug: GUARDIAN_SLUG,
  promptVersion: GUARDIAN_PROMPT_VERSION,
  policyVersion: GUARDIAN_POLICY_VERSION,
  allowlist: GUARDIAN_ALLOWLIST,
  schedules: GUARDIAN_SCHEDULES,
  /**
   * Condiciones para sacarlo de shadow. No es una lista decorativa: sin
   * medirlas, "parece que funciona" es todo lo que se tendría.
   *
   * Ver docs/agent-os/agents-tools-policies.md §5.
   */
  exitShadowCriteria: [
    'al menos 14 días en shadow',
    'cero exposiciones de secretos en los informes revisados',
    'falsos positivos críticos por debajo del umbral acordado',
    'todos los incidentes críticos reales detectados por las reglas',
    'coste dentro del presupuesto del agente',
    'revisión humana de una muestra de informes',
    'ningún efecto externo producido',
  ],
} as const;
