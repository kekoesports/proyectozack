import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getEditorialSlotsForAdmin, getPublishedNewsPostsForAdmin } from '@/lib/queries/editorialSlots';
import { updateEditorialSlotAction, updateFeaturedMatchAction } from '../actions';

const SLOT_LABELS: Record<string, string> = {
  hero: 'Hero principal',
  secondary_1: 'Secundaria izquierda',
  secondary_2: 'Secundaria derecha',
  featured_interview: 'Entrevista destacada',
  featured_clip: 'Clip destacado',
  featured_match: 'Partido destacado',
};

const SLOT_DESC: Record<string, string> = {
  hero: 'Noticia grande en la cabecera de /news',
  secondary_1: 'Primera noticia junto al hero',
  secondary_2: 'Segunda noticia junto al hero',
  featured_interview: 'Bloque inferior izquierdo — entrevista',
  featured_clip: 'Bloque inferior central — clip/vídeo',
  featured_match: 'Sidebar — partido manual (equipo A vs B, hora, torneo)',
};

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';

type MatchMeta = { team1?: string; team2?: string; tournament?: string; matchDate?: string; matchTime?: string };

export default async function EditorialSlotsPage() {
  await requirePermission('noticias', 'publish');
  const [slots, publishedPosts] = await Promise.all([
    getEditorialSlotsForAdmin(),
    getPublishedNewsPostsForAdmin(),
  ]);

  const matchSlot = slots.find((s) => s.slot === 'featured_match');
  const matchMeta = (matchSlot?.meta ?? {}) as MatchMeta;
  const otherSlots = slots.filter((s) => s.slot !== 'featured_match');

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">
          ← Noticias
        </Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Slots editoriales</h1>
      </div>
      <p className="text-sm text-sp-admin-muted mb-8">
        Asigna qué noticia aparece en cada posición del hub <code className="text-xs font-mono bg-sp-admin-bg px-1 py-0.5 rounded">/news</code>.
        Los cambios se aplican en la próxima revalidación (máx. 2 min).
      </p>

      {/* Slots de noticias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {otherSlots.map((s) => (
          <div key={s.slot} className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
            <div className="mb-3">
              <p className="font-semibold text-sp-admin-text text-sm">{SLOT_LABELS[s.slot] ?? s.slot}</p>
              <p className="text-xs text-sp-admin-muted mt-0.5">{SLOT_DESC[s.slot] ?? ''}</p>
            </div>
            <form action={updateEditorialSlotAction} className="flex items-center gap-2">
              <input type="hidden" name="slot" value={s.slot} />
              <select
                name="postId"
                defaultValue={s.postId?.toString() ?? ''}
                className="flex-1 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors"
              >
                <option value="">— Sin asignar (automático) —</option>
                {publishedPosts.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.title.slice(0, 60)}{p.title.length > 60 ? '…' : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="px-3 py-2 rounded-lg bg-sp-orange text-white text-xs font-bold hover:bg-sp-orange/90 transition-colors whitespace-nowrap">
                Guardar
              </button>
            </form>
            {s.postId && <p className="text-[11px] text-sp-admin-muted mt-2 font-mono">post_id: {s.postId}</p>}
          </div>
        ))}
      </div>

      {/* Partido destacado — formulario de meta */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <div className="mb-4">
          <p className="font-semibold text-sp-admin-text text-sm">{SLOT_LABELS['featured_match']}</p>
          <p className="text-xs text-sp-admin-muted mt-0.5">{SLOT_DESC['featured_match']}</p>
        </div>
        <form action={updateFeaturedMatchAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Equipo A</label>
            <input name="team1" className={inputCls} placeholder="Gentle Mates" defaultValue={matchMeta.team1 ?? ''} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Equipo B</label>
            <input name="team2" className={inputCls} placeholder="MOUZ" defaultValue={matchMeta.team2 ?? ''} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Torneo</label>
            <input name="tournament" className={inputCls} placeholder="PGL Astana 2026" defaultValue={matchMeta.tournament ?? ''} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Fecha</label>
            <input name="matchDate" type="date" className={inputCls} defaultValue={matchMeta.matchDate ?? ''} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Hora (local)</label>
            <input name="matchTime" type="time" className={inputCls} defaultValue={matchMeta.matchTime ?? ''} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors">
              Guardar partido
            </button>
          </div>
        </form>
        {matchMeta.team1 && <p className="text-xs text-sp-admin-muted mt-3">{matchMeta.team1} vs {matchMeta.team2} · {matchMeta.matchDate}{matchMeta.matchTime ? ` ${matchMeta.matchTime}` : ''} · {matchMeta.tournament}</p>}
      </div>

      <div className="mt-6 rounded-xl bg-sp-admin-bg border border-sp-admin-border px-4 py-3 text-xs text-sp-admin-muted">
        <strong className="text-sp-admin-text">Fallback automático:</strong> si un slot no tiene noticia asignada, el layout de <code>/news</code> usa las noticias más recientes por defecto.
      </div>
    </div>
  );
}
