/**
 * Configuración de misiones Twitch por creador.
 *
 * `broadcasterId` es el user ID Helix (numérico) del canal objetivo.
 * `channelUrl` es la URL twitch.tv/<login> para el CTA "Abrir Twitch".
 *
 * Ninguno es secreto. Se mantienen en env para poder rotar/actualizar
 * por creador sin re-desplegar.
 *
 * Añadir un creador nuevo: crear vars `TWITCH_<CREATOR>_BROADCASTER_ID`
 * y `TWITCH_<CREATOR>_CHANNEL_URL` en env.ts + Vercel + mapa aquí.
 */

import { env } from '@/lib/env';

export interface TwitchMissionTarget {
  /** slug del creador — coincide con `creators.ts`. */
  creatorSlug: string;
  /** Broadcaster ID Helix (numérico). Ej: '12345678'. */
  broadcasterId: string;
  /** URL pública del canal — para el CTA "Abrir Twitch". */
  channelUrl: string;
}

/**
 * Devuelve la config de la misión Twitch de un creador o `null` si no
 * está definida (variables env sin poblar).
 */
export function getTwitchMissionTarget(creatorSlug: string): TwitchMissionTarget | null {
  switch (creatorSlug) {
    case 'zacketizor': {
      const broadcasterId = env.TWITCH_ZACKETIZOR_BROADCASTER_ID;
      const channelUrl = env.TWITCH_ZACKETIZOR_CHANNEL_URL;
      if (!broadcasterId || !channelUrl) return null;
      return { creatorSlug, broadcasterId, channelUrl };
    }
    default:
      return null;
  }
}

/**
 * True si Twitch OAuth de usuario está mínimamente configurado
 * (client id + secret + redirect). El TWITCH_CLIENT_ID/SECRET ya se
 * usaba para el servicio server-to-server; ahora sirve también para
 * el OAuth de usuario.
 */
export function isTwitchOauthConfigured(): boolean {
  return Boolean(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET && env.TWITCH_OAUTH_REDIRECT_URL);
}

/**
 * Scope OAuth mínimo para verificar follow: solo lectura de la lista
 * de canales seguidos por el usuario. No incluye scopes de subs de
 * pago (esos son restricted y fuera de scope Fase B).
 */
export const TWITCH_OAUTH_SCOPES = 'user:read:follows' as const;

/** verificationMode canónico que persiste en `platform_missions`. */
export const TWITCH_FOLLOW_CHANNEL_MODE = 'twitch_follow_channel' as const;
