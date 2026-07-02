import { env } from '@/lib/env';

/**
 * Registry central de OAuth providers para social linking.
 *
 * Provider = 'discord' | 'google' | 'x' | 'instagram'.
 *
 * PR-1b-1 solo implementa 'discord' y 'google' con OAuth real.
 * 'x' e 'instagram' están declarados como `status: 'planned'` — la UI
 * los muestra como "próximamente" y los endpoints devuelven 501.
 */

export type SocialProviderKey = 'discord' | 'google' | 'x' | 'instagram';

export interface ActiveProviderConfig {
  status: 'active';
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  revokeUrl?: string;
  scopes: string[];
  /** getter para el client id, permite que sea undefined en dev */
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
}

export interface PlannedProviderConfig {
  status: 'planned';
  displayName: string;
  reason: string;
}

export type ProviderConfig = ActiveProviderConfig | PlannedProviderConfig;

/** Providers activos (con OAuth real). */
const ACTIVE_PROVIDERS: readonly SocialProviderKey[] = ['discord', 'google'] as const;
/** Providers planned (UI los muestra pero endpoints responden 501). */
const PLANNED_PROVIDERS: readonly SocialProviderKey[] = ['x', 'instagram'] as const;

const REGISTRY: Record<SocialProviderKey, ProviderConfig> = {
  discord: {
    status: 'active',
    displayName: 'Discord',
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    profileUrl: 'https://discord.com/api/users/@me',
    revokeUrl: 'https://discord.com/api/oauth2/token/revoke',
    scopes: ['identify', 'guilds', 'guilds.members.read'],
    clientId: () => env.DISCORD_CLIENT_ID,
    clientSecret: () => env.DISCORD_CLIENT_SECRET,
  },
  google: {
    status: 'active',
    displayName: 'YouTube',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET,
  },
  x: {
    status: 'planned',
    displayName: 'X / Twitter',
    reason: 'Congelado hasta validar coste (X API v2 Basic $100/mes)',
  },
  instagram: {
    status: 'planned',
    displayName: 'Instagram',
    reason: 'Meta/Basic Display no permite verificar acciones sociales — futuro manual',
  },
};

/** Lista completa de providers conocidos (incluye planned). */
export function listAllProviders(): SocialProviderKey[] {
  return [...ACTIVE_PROVIDERS, ...PLANNED_PROVIDERS];
}

/** Solo los providers con OAuth real. */
export function listActiveProviders(): SocialProviderKey[] {
  return [...ACTIVE_PROVIDERS];
}

/** Devuelve la config de un provider o `null` si no existe. */
export function getProvider(key: string): ProviderConfig | null {
  if (!(key in REGISTRY)) return null;
  return REGISTRY[key as SocialProviderKey];
}

/** True si el provider existe y su OAuth está implementado. */
export function isActiveProvider(key: string): key is SocialProviderKey {
  const cfg = getProvider(key);
  return cfg?.status === 'active';
}

/** True si el provider existe pero está congelado. */
export function isPlannedProvider(key: string): key is SocialProviderKey {
  const cfg = getProvider(key);
  return cfg?.status === 'planned';
}

/**
 * True si un provider activo tiene client_id + client_secret configurados
 * en env. Si false, la UI muestra "No configurado todavía" y los
 * endpoints responden 503.
 */
export function isProviderConfigured(key: string): boolean {
  const cfg = getProvider(key);
  if (cfg?.status !== 'active') return false;
  return Boolean(cfg.clientId() && cfg.clientSecret());
}
