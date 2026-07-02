import { fetchKeydropList, isKeydropConfigured } from '@/lib/keydrop/client';
import { toKeydropCard } from '@/lib/keydrop/mappers';
import type { KeydropSections } from '@/lib/keydrop/types';

export type { KeydropSections };

/**
 * High-level query: sorteos KeyDrop de ZACKETIZOR ya mapeados a card interna.
 *
 * Retorna `{ active, finished }` — la UI muestra activos por defecto y
 * finalizados en desplegable.
 *
 * Degradación silenciosa: cualquier fallo (no configurado, timeout, http,
 * shape mismatch) → listas vacías. Nunca lanza. La página no rompe.
 */
export async function getKeydropZacketizorGiveaways(): Promise<KeydropSections> {
  if (!isKeydropConfigured()) {
    return { active: [], finished: [], status: 'not_configured' };
  }
  const res = await fetchKeydropList();
  if (!res.ok) {
    return { active: [], finished: [], status: 'error' };
  }
  const active = res.data.data.active.map(toKeydropCard);
  const finished = res.data.data.finished.map(toKeydropCard);
  return { active, finished, status: 'ok' };
}
