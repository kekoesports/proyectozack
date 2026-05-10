/**
 * Helpers para clasificar creators por rol de escena y país. Sin DB
 * column dedicada — derivamos de campos existentes (talents.role +
 * talents.game para rol; talents.creator_country para país).
 *
 * Cuando se promueva a columna estructurada (Fase 2 con admin CRUD),
 * estas funciones se usan como migration assist.
 */

export type SceneRole = 'pro' | 'tier2' | 'analista' | 'creator' | 'coach';

const ROLE_PATTERNS: ReadonlyArray<{ kind: SceneRole; re: RegExp }> = [
  { kind: 'coach',    re: /\bcoach|entrenador\b/i },
  { kind: 'analista', re: /\banalista|caster|comentarist|host|talent[- ]?show|broadcaster\b/i },
  { kind: 'pro',      re: /\bpro[- ]?player|profesional|player|jugador[- ]?(pro|activo)|esports[- ]?streamer\b/i },
  { kind: 'tier2',    re: /\btier[- ]?2|tier[- ]?3|advanced[- ]?player\b/i },
];

/**
 * Deriva el rol de escena (PRO / TIER 2 / ANALISTA / CREATOR / COACH)
 * desde el campo libre `talent.role` + `talent.game`. Si nada matchea,
 * default 'creator' — la mayoría del roster CS2 es creator de contenido.
 */
export function deriveSceneRole(role: string | null, game: string | null): SceneRole {
  const haystack = `${role ?? ''} ${game ?? ''}`.toLowerCase();
  for (const { kind, re } of ROLE_PATTERNS) {
    if (re.test(haystack)) return kind;
  }
  return 'creator';
}

const SCENE_ROLE_LABELS: Record<SceneRole, string> = {
  pro: 'PRO',
  tier2: 'TIER 2',
  analista: 'ANALISTA',
  creator: 'CREATOR',
  coach: 'COACH',
};

const SCENE_ROLE_ACCENTS: Record<SceneRole, string> = {
  pro: 'text-sp-pink bg-sp-pink/10 border-sp-pink/30',
  tier2: 'text-sp-purple bg-sp-purple/10 border-sp-purple/30',
  analista: 'text-sp-blue bg-sp-blue/10 border-sp-blue/30',
  creator: 'text-sp-orange bg-sp-orange/10 border-sp-orange/30',
  coach: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
};

export function sceneRoleLabel(kind: SceneRole): string {
  return SCENE_ROLE_LABELS[kind];
}

export function sceneRoleClass(kind: SceneRole): string {
  return SCENE_ROLE_ACCENTS[kind];
}

/**
 * Países hispanos relevantes para el roster SocialPro. Otros códigos
 * ISO devuelven label como key para no romper UI.
 */
const COUNTRIES: Record<string, { label: string; flag: string }> = {
  ES: { label: 'España',    flag: '🇪🇸' },
  AR: { label: 'Argentina', flag: '🇦🇷' },
  MX: { label: 'México',    flag: '🇲🇽' },
  CL: { label: 'Chile',     flag: '🇨🇱' },
  CO: { label: 'Colombia',  flag: '🇨🇴' },
  PE: { label: 'Perú',      flag: '🇵🇪' },
  UY: { label: 'Uruguay',   flag: '🇺🇾' },
  VE: { label: 'Venezuela', flag: '🇻🇪' },
};

export function countryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return COUNTRIES[upper]?.label ?? upper;
}

export function countryFlag(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRIES[code.toUpperCase()]?.flag ?? null;
}

/** Categoriza ES como "ESP" y resto como "LATAM" para chips simplificadas. */
export function regionGroup(code: string | null | undefined): 'esp' | 'latam' | 'other' {
  if (!code) return 'other';
  const upper = code.toUpperCase();
  if (upper === 'ES') return 'esp';
  if (['AR', 'MX', 'CL', 'CO', 'PE', 'UY', 'VE'].includes(upper)) return 'latam';
  return 'other';
}

export const COUNTRY_FILTER_OPTIONS = ['ES', 'AR', 'MX', 'CL'] as const;
export const SCENE_ROLE_FILTER_OPTIONS: SceneRole[] = ['pro', 'tier2', 'analista', 'creator'];
