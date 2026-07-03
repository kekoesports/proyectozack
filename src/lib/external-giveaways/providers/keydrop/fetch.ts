import { safeExternalFetch } from '../../client-factory';
import type { ExternalGiveawayCard } from '../../types';
import type { ProviderConfig } from '../../providers';
import { KeydropListResponseSchema } from './zod-schemas';
import { keydropItemToCard } from './mapper';

/**
 * Fetch específico de KeyDrop — usa `safeExternalFetch` del client-factory
 * genérico y transforma la respuesta a `ExternalGiveawayCard[]`.
 *
 * Config del provider (URL base, listing URL, cache, badge) exportada como
 * `KEYDROP_CONFIG` y registrada en `providers.ts`.
 */

const KEYDROP_BASE_URL = 'https://ws-2071.socket-cs.com/v1/giveaway-user';
const KEYDROP_LISTING_URL = 'https://key-drop.com/es/giveaways';
const KEYDROP_REVALIDATE_SECONDS = 60;

/**
 * URL destino del botón "Ver en KeyDrop". KeyDrop no expone URL pública
 * individual por giveaway (verificado 2026-07 — devuelve 404); apuntamos
 * al listing general. Si en el futuro KeyDrop publica URLs por id,
 * actualizar aquí y el argumento _id vuelve a interpolarse.
 */
function buildKeydropExternalUrl(_id: string): string {
  return KEYDROP_LISTING_URL;
}

/**
 * Fetch para un creador concreto: llama /api/list y mapea. Devuelve el
 * shape que espera el registry (`{ ok: true, active, finished }` o
 * `{ ok: false, error }`).
 *
 * Errores:
 *   - not_configured → sin api key.
 *   - error          → cualquier fallo de fetch/http/parse (degradación silenciosa).
 */
export async function fetchKeydropForCreator(input: {
  creatorSlug: string;
  apiKey: string | undefined;
}): Promise<
  | { ok: true; active: ExternalGiveawayCard[]; finished: ExternalGiveawayCard[] }
  | { ok: false; error: 'not_configured' | 'error' }
> {
  const { creatorSlug, apiKey } = input;

  const res = await safeExternalFetch({
    providerKey: 'keydrop',
    baseUrl: KEYDROP_BASE_URL,
    path: '/api/list',
    apiKey,
    authHeader: 'x-api-key',
    schema: KeydropListResponseSchema,
    revalidateSeconds: KEYDROP_REVALIDATE_SECONDS,
  });

  if (!res.ok) {
    if (res.error === 'not_configured') return { ok: false, error: 'not_configured' };
    return { ok: false, error: 'error' };
  }

  const active = res.data.data.active.map((item) =>
    keydropItemToCard({ item, creatorSlug, externalUrl: buildKeydropExternalUrl(item.id) })
  );
  const finished = res.data.data.finished.map((item) =>
    keydropItemToCard({ item, creatorSlug, externalUrl: buildKeydropExternalUrl(item.id) })
  );
  return { ok: true, active, finished };
}

/** Config expuesta al registry. */
export const KEYDROP_CONFIG: ProviderConfig = {
  key: 'keydrop',
  displayName: 'KeyDrop',
  logoAsset: '/images/brands/keydrop.png',
  listingUrl: KEYDROP_LISTING_URL,
  accentColor: '#e03070',
  revalidateSeconds: KEYDROP_REVALIDATE_SECONDS,
  fetchForCreator: fetchKeydropForCreator,
};
