/**
 * Steam OpenID 2.0 helpers.
 *
 * Flujo:
 *   1) buildLoginUrl(returnTo, realm)   → URL a la que redirigir al usuario.
 *   2) Steam vuelve al callback con params `openid.*` en la query.
 *   3) verifyOpenIdResponse(params)     → POST a Steam para validar.
 *   4) extractSteamId(claimedId)        → SteamID64 numérico.
 *
 * Todas las funciones son puras salvo `verifyOpenIdResponse` que hace fetch.
 * Sin dependencias externas — Steam OpenID es texto plano, muy simple.
 */

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';

const REQUIRED_CALLBACK_PARAMS = [
  'openid.ns',
  'openid.mode',
  'openid.op_endpoint',
  'openid.claimed_id',
  'openid.identity',
  'openid.return_to',
  'openid.response_nonce',
  'openid.assoc_handle',
  'openid.signed',
  'openid.sig',
] as const;

/** Regex estricta: SteamID64 = 17 dígitos exactos. */
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export interface CallbackParams {
  [key: string]: string;
}

/**
 * Construye la URL de login OpenID de Steam.
 * `returnTo` es la URL absoluta a la que Steam devolverá al usuario.
 * `realm` es la raíz del sitio (Steam la muestra al usuario como "estás iniciando sesión en X").
 */
export function buildLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

/**
 * Extrae los params `openid.*` de la query del callback.
 * Devuelve `null` si falta alguno de los campos obligatorios.
 */
export function extractCallbackParams(query: URLSearchParams): CallbackParams | null {
  const out: CallbackParams = {};
  for (const key of REQUIRED_CALLBACK_PARAMS) {
    const v = query.get(key);
    if (v === null) return null;
    out[key] = v;
  }
  return out;
}

/**
 * Extrae el SteamID64 del `openid.claimed_id`.
 * Devuelve `null` si el formato no es exactamente el esperado.
 */
export function extractSteamId(claimedId: string): string | null {
  const m = CLAIMED_ID_RE.exec(claimedId);
  return m ? (m[1] ?? null) : null;
}

/**
 * Valida el response del callback contra Steam vía `check_authentication`.
 * Steam responde en texto plano con líneas `key:value\n`. Buscamos `is_valid:true`.
 *
 * Devuelve `true` solo si Steam confirma la firma. Cualquier error de red,
 * timeout o respuesta inesperada devuelve `false` (fail-closed).
 */
export async function verifyOpenIdResponse(
  params: CallbackParams,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<boolean> {
  const body = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetchImpl(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const text = await res.text();
    return parseIsValid(text);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parser expuesto para testeo unitario del formato de respuesta OpenID KV.
 * Steam devuelve líneas `key:value` separadas por `\n`. Requiere `is_valid:true` exacto.
 */
export function parseIsValid(kvText: string): boolean {
  for (const line of kvText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'is_valid:true') return true;
  }
  return false;
}

/** Placeholder de email estable para satisfacer `user.email NOT NULL + UNIQUE`. */
export function steamEmailPlaceholder(steamId64: string): string {
  return `steam_${steamId64}@steam.socialpro.internal`;
}
