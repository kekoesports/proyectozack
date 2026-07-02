/**
 * Steam Web API — fetch de perfil público (nombre, avatar).
 * Requiere STEAM_API_KEY. Si falta, devolvemos fallback controlado:
 *   { personaName: 'Jugador de Steam', avatarUrl: null }.
 *
 * NUNCA loguear la API key. `fetchSteamProfile` compone la URL internamente
 * y solo devuelve datos del jugador.
 */

const STEAM_SUMMARY_URL = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/';
const FETCH_TIMEOUT_MS = 10_000;

export interface SteamProfile {
  personaName: string;
  avatarUrl: string | null;
}

export const FALLBACK_PROFILE: SteamProfile = {
  personaName: 'Jugador de Steam',
  avatarUrl: null,
};

interface RawSummary {
  personaname?: unknown;
  avatarfull?: unknown;
}

interface RawResponse {
  response?: {
    players?: RawSummary[];
  };
}

/**
 * Devuelve el perfil público del `steamId64`. Nunca lanza:
 *  - Si no hay API key → FALLBACK_PROFILE.
 *  - Si Steam falla o responde malformado → FALLBACK_PROFILE.
 *  - Si Steam no encuentra al usuario → FALLBACK_PROFILE (nombre visible corregible en perfil).
 *
 * `apiKey` se pasa explícitamente (no se lee de env aquí) para que el caller
 * decida si tiene la key. Facilita tests.
 */
export async function fetchSteamProfile(
  steamId64: string,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<SteamProfile> {
  if (!apiKey) return FALLBACK_PROFILE;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({ key: apiKey, steamids: steamId64 });
    const res = await fetchImpl(`${STEAM_SUMMARY_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return FALLBACK_PROFILE;

    const raw = (await res.json()) as RawResponse;
    const player = raw?.response?.players?.[0];
    if (!player) return FALLBACK_PROFILE;

    const personaName =
      typeof player.personaname === 'string' && player.personaname.length > 0
        ? player.personaname.slice(0, 100)
        : FALLBACK_PROFILE.personaName;
    const avatarUrl =
      typeof player.avatarfull === 'string' && /^https:\/\/[a-z0-9./_-]+$/i.test(player.avatarfull)
        ? player.avatarfull
        : null;

    return { personaName, avatarUrl };
  } catch {
    return FALLBACK_PROFILE;
  } finally {
    clearTimeout(timer);
  }
}
