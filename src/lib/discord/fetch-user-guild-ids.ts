import { z } from 'zod';

/**
 * Lista de guild IDs del usuario autenticado con el access token OAuth.
 *
 * Discord devuelve max 200 por página (`limit` default 200). Pagina con
 * `after` hasta vaciar el cursor — sin esto usuarios con muchos servidores
 * podían fallar verificación aunque sí estuvieran en el guild objetivo.
 *
 * NO persiste la lista. Solo IDs en memoria para el chequeo de membresía.
 */
const GuildPageSchema = z.array(z.object({ id: z.string() }).passthrough());

const PAGE_LIMIT = 200;
const MAX_PAGES = 10; // 2000 guilds — techo defensivo

export async function fetchDiscordUserGuildIds(accessToken: string): Promise<
  | { ok: true; guildIds: string[] }
  | { ok: false; code: 'token_expired' | 'api_error' }
> {
  const ids: string[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL('https://discord.com/api/v10/users/@me/guilds');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    if (after) url.searchParams.set('after', after);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      return { ok: false, code: 'api_error' };
    }

    if (res.status === 401) return { ok: false, code: 'token_expired' };
    if (!res.ok) return { ok: false, code: 'api_error' };

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, code: 'api_error' };
    }

    const parsed = GuildPageSchema.safeParse(data);
    if (!parsed.success) return { ok: false, code: 'api_error' };
    if (parsed.data.length === 0) break;

    for (const g of parsed.data) ids.push(g.id);
    if (parsed.data.length < PAGE_LIMIT) break;
    after = parsed.data[parsed.data.length - 1]?.id;
    if (!after) break;
  }

  return { ok: true, guildIds: ids };
}
