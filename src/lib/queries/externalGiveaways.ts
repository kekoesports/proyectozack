import { getCreatorBinding } from '@/lib/external-giveaways/creator-bindings';
import { getProvider } from '@/lib/external-giveaways/providers';
import type { ExternalGiveawaySections, ProviderKey } from '@/lib/external-giveaways/types';

/**
 * High-level query: sorteos externos ya mapeados a shape común para un
 * creador concreto.
 *
 * Resuelve `slug → binding → provider → fetch + mapper` y devuelve
 * `ExternalGiveawaySections` con:
 *   - `active` / `finished`: cards ya mapeadas.
 *   - `providerKey`: qué provider resolvió (o `null` si sin binding).
 *   - `status`: 'no_binding' | 'not_configured' | 'error' | 'ok'.
 *
 * Degradación silenciosa: cualquier fallo → listas vacías. Nunca lanza.
 */
export async function getExternalGiveawaysForCreator(slug: string): Promise<ExternalGiveawaySections> {
  const binding = getCreatorBinding(slug);
  if (!binding) {
    return { active: [], finished: [], providerKey: null, status: 'no_binding' };
  }
  const provider = getProvider(binding.provider);
  if (!provider) {
    // Binding apunta a un provider desconocido — probable bug de
    // registration; degradamos igual sin romper la UI.
    return { active: [], finished: [], providerKey: null, status: 'error' };
  }

  const providerKey: ProviderKey = binding.provider;
  const apiKey = binding.apiKey();
  const res = await provider.fetchForCreator({ creatorSlug: slug, apiKey });

  if (!res.ok) {
    return { active: [], finished: [], providerKey, status: res.error };
  }
  return { active: res.active, finished: res.finished, providerKey, status: 'ok' };
}
