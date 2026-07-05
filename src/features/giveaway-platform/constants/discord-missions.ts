/**
 * Configuración de misiones Discord por creador.
 *
 * `guildId` e `inviteUrl` se leen de env vars. Ninguno es secreto — el
 * guild ID es público en Discord y la invite URL es visible en el
 * enlace. Se mantienen en env para poder rotar/actualizar por creador
 * sin re-desplegar.
 *
 * Añadir un creador nuevo: crear vars `DISCORD_<CREATOR>_GUILD_ID` y
 * `DISCORD_<CREATOR>_INVITE_URL` en env.ts + Vercel + mapa aquí.
 */

import { env } from '@/lib/env';

export interface DiscordMissionTarget {
  /** slug del creador — coincide con `creators.ts` */
  creatorSlug: string;
  /** Guild ID (snowflake Discord). */
  guildId: string;
  /** Invite URL pública para unirse al servidor. */
  inviteUrl: string;
}

/**
 * Devuelve la config de la misión Discord de un creador o `null` si no
 * está definida (variables env sin poblar).
 */
export function getDiscordMissionTarget(creatorSlug: string): DiscordMissionTarget | null {
  switch (creatorSlug) {
    case 'zacketizor': {
      const guildId = env.DISCORD_ZACKETIZOR_GUILD_ID;
      const inviteUrl = env.DISCORD_ZACKETIZOR_INVITE_URL;
      if (!guildId || !inviteUrl) return null;
      return { creatorSlug, guildId, inviteUrl };
    }
    default:
      return null;
  }
}

/** True si Discord OAuth está mínimamente configurado (client + secret + redirect). */
export function isDiscordOauthConfigured(): boolean {
  return Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.DISCORD_OAUTH_REDIRECT_URL);
}

/** Scopes canónicos que pedimos en el flujo OAuth. */
export const DISCORD_OAUTH_SCOPES = 'identify guilds' as const;

/** verificationMode canónico que persiste en `platform_missions`. */
export const DISCORD_GUILD_MEMBER_MODE = 'discord_guild_member' as const;
