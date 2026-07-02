/**
 * Better Auth plugin — Steam OpenID 2.0.
 *
 * Registra dos endpoints bajo el catch-all `/api/auth/*` del handler
 * principal de Better Auth:
 *
 *   GET /api/auth/steam/login     — genera state, redirect a Steam.
 *   GET /api/auth/steam/callback  — valida state + OpenID, upsert user +
 *                                    account + player_profiles, crea
 *                                    sesión Better Auth y redirect a la app.
 *
 * Los usuarios Steam:
 *   - se identifican con `account.providerId='steam'` + `accountId=<steamId64>`
 *   - tienen `role = null` — nunca admin/staff (verificar en auth-guard)
 *   - email placeholder no verificado: `steam_<sid>@steam.socialpro.internal`
 *   - avatar y nombre vienen de Steam Web API si `STEAM_API_KEY` está definida.
 */

import { createAuthEndpoint } from '@better-auth/core/api';
import type { BetterAuthPlugin } from '@better-auth/core';
import { APIError } from '@better-auth/core/error';
import { generateId } from '@better-auth/core/utils/id';
import { setSessionCookie } from 'better-auth/cookies';

import { db } from '@/lib/db';
import { playerProfiles } from '@/db/schema';
import { env } from '@/lib/env';

import {
  buildLoginUrl,
  extractCallbackParams,
  extractSteamId,
  steamEmailPlaceholder,
  verifyOpenIdResponse,
} from './openid';
import { fetchSteamProfile } from './profile';

const STATE_COOKIE = 'steam_openid_state';
const STATE_TTL_SEC = 600;
const DEFAULT_SUCCESS_URL = '/sorteos/plataforma';

export interface SteamOpenIdOptions {
  /** URL a la que redirigir tras login OK. */
  successUrl?: string;
  /** URL a la que redirigir tras error (mismo por defecto que successUrl). */
  errorUrl?: string;
}

function toCallbackParams(query: Record<string, unknown>): URLSearchParams {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === 'string') usp.set(k, v);
  }
  return usp;
}

/**
 * Shape mínimo del `ctx` que exponemos al handler. Better Auth tipa esto de
 * forma muy rica internamente; solo declaramos lo que usamos.
 */
interface SteamCtx {
  context: {
    baseURL: string;
    secret: string;
    internalAdapter: {
      findOAuthUser: (
        email: string,
        accountId: string,
        providerId: string,
      ) => Promise<{ user: SteamUser } | null>;
      createOAuthUser: (
        user: {
          email: string;
          emailVerified: boolean;
          name: string;
          image: string | null;
          role?: string | null;
        },
        account: { accountId: string; providerId: string },
      ) => Promise<{ user: SteamUser } | null>;
      updateUser: (
        id: string,
        patch: { name?: string; image?: string | null },
      ) => Promise<SteamUser>;
      createSession: (userId: string) => Promise<SteamSession | null>;
    };
  };
  query: Record<string, unknown>;
  setSignedCookie: (
    name: string,
    value: string,
    secret: string,
    opts: {
      httpOnly: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      secure: boolean;
      maxAge: number;
      path: string;
    },
  ) => Promise<void>;
  getSignedCookie: (name: string, secret: string) => Promise<string | null | undefined>;
  redirect: (url: string) => Response;
}

interface SteamUser {
  id: string;
  name: string;
  image: string | null;
}
interface SteamSession {
  token: string;
  userId: string;
}

export const steamOpenId = (options: SteamOpenIdOptions = {}): BetterAuthPlugin => {
  const successUrl = options.successUrl ?? DEFAULT_SUCCESS_URL;
  const errorUrl = options.errorUrl ?? successUrl;

  return {
    id: 'steam-openid',
    endpoints: {
      steamLogin: createAuthEndpoint(
        '/steam/login',
        { method: 'GET' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth ctx tiene un tipo interno muy rico; ver SteamCtx para superficie usada
        async (rawCtx: any) => {
          const ctx = rawCtx as SteamCtx;
          const state = generateId(32);
          const baseURL = ctx.context.baseURL;
          const returnTo = `${baseURL}/steam/callback?state=${encodeURIComponent(state)}`;
          const realm = new URL(baseURL).origin;

          await ctx.setSignedCookie(STATE_COOKIE, state, ctx.context.secret, {
            httpOnly: true,
            sameSite: 'lax',
            secure: baseURL.startsWith('https://'),
            maxAge: STATE_TTL_SEC,
            path: '/',
          });

          throw ctx.redirect(buildLoginUrl(returnTo, realm));
        },
      ),

      steamCallback: createAuthEndpoint(
        '/steam/callback',
        { method: 'GET' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
        async (rawCtx: any) => {
          const ctx = rawCtx as SteamCtx;

          const stateCookie = await ctx.getSignedCookie(STATE_COOKIE, ctx.context.secret);
          const stateQuery = typeof ctx.query['state'] === 'string' ? ctx.query['state'] : null;
          if (!stateCookie || !stateQuery || stateCookie !== stateQuery) {
            throw ctx.redirect(`${errorUrl}?steam_error=state`);
          }

          const usp = toCallbackParams(ctx.query);
          const parsed = extractCallbackParams(usp);
          if (!parsed) {
            throw ctx.redirect(`${errorUrl}?steam_error=params`);
          }

          const isValid = await verifyOpenIdResponse(parsed);
          if (!isValid) {
            throw ctx.redirect(`${errorUrl}?steam_error=verify`);
          }

          const claimedId = parsed['openid.claimed_id'] ?? '';
          const steamId = extractSteamId(claimedId);
          if (!steamId) {
            throw ctx.redirect(`${errorUrl}?steam_error=steamid`);
          }

          const profile = await fetchSteamProfile(steamId, env.STEAM_API_KEY);
          const email = steamEmailPlaceholder(steamId);

          const existing = await ctx.context.internalAdapter.findOAuthUser(email, steamId, 'steam');
          let user: SteamUser;
          if (existing) {
            user = existing.user;
            if (user.name !== profile.personaName || user.image !== profile.avatarUrl) {
              user = await ctx.context.internalAdapter.updateUser(user.id, {
                name: profile.personaName,
                image: profile.avatarUrl,
              });
            }
          } else {
            const created = await ctx.context.internalAdapter.createOAuthUser(
              {
                email,
                emailVerified: false,
                name: profile.personaName,
                image: profile.avatarUrl,
                role: null,
              },
              { accountId: steamId, providerId: 'steam' },
            );
            if (!created?.user) {
              throw new APIError('INTERNAL_SERVER_ERROR', {
                message: 'Failed to create Steam user',
              });
            }
            user = created.user;
          }

          // Upsert player_profiles: crea la fila la primera vez y NO pisa
          // steamTradeUrl / isPrivate / shippingAddress en logins posteriores.
          await db
            .insert(playerProfiles)
            .values({ userId: user.id, steamId })
            .onConflictDoNothing();

          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) {
            throw new APIError('INTERNAL_SERVER_ERROR', {
              message: 'Failed to create Steam session',
            });
          }

          // Better Auth's setSessionCookie usa el ctx interno del router + las
          // filas completas de session/user de la DB; nuestros tipos SteamCtx/
          // SteamUser/SteamSession son un subconjunto para tipar solo lo que
          // usamos. Cast necesario para el interop.
          /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
          await setSessionCookie(ctx as any, { session, user } as any);
          /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

          throw ctx.redirect(successUrl);
        },
      ),
    },
  };
};
