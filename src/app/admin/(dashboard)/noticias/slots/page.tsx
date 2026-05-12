import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getEditorialSlotsForAdmin, getPublishedNewsPostsForAdmin } from '@/lib/queries/editorialSlots';
import { updateEditorialSlotAction, updateFeaturedMatchAction } from '../actions';
import { FeaturedMatchCard } from '@/features/news/components/FeaturedMatchCard';
import type { FeaturedMatchMeta } from '@/features/news/components/FeaturedMatchCard';

const SLOT_LABELS: Record<string, string> = {
  hero:               'Hero principal',
  secondary_1:        'Secundaria izquierda',
  secondary_2:        'Secundaria derecha',
  featured_interview: 'Entrevista destacada',
  featured_clip:      'Clip destacado',
  featured_match:     'Partido destacado',
};

const SLOT_DESC: Record<string, string> = {
  hero:               'Noticia grande en la cabecera de /news',
  secondary_1:        'Primera noticia junto al hero',
  secondary_2:        'Segunda noticia junto al hero',
  featured_interview: 'Bloque inferior izquierdo — entrevista',
  featured_clip:      'Bloque inferior central — clip/vídeo',
  featured_match:     'Sidebar derecha — partido destacado',
};

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors placeholder:text-sp-admin-muted/40';
const LABEL  = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const SELECT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';

export default async function EditorialSlotsPage() {
  await requirePermission('noticias', 'publish');
  const [slots, publishedPosts] = await Promise.all([
    getEditorialSlotsForAdmin(),
    getPublishedNewsPostsForAdmin(),
  ]);

  const matchSlot  = slots.find((s) => s.slot === 'featured_match');
  const matchMeta  = (matchSlot?.meta ?? {}) as FeaturedMatchMeta;
  const otherSlots = slots.filter((s) => s.slot !== 'featured_match');

  const hasTeams = !!(matchMeta.team1 && matchMeta.team2);

  return (
    <div>
      {/* Breadcrumb */}
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

      {/* ── Slots de artículos ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

      {/* ── Partido destacado ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
        {/* Header con estado */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-sp-admin-border">
          <div>
            <p className="font-semibold text-sp-admin-text text-sm">Partido destacado</p>
            <p className="text-xs text-sp-admin-muted mt-0.5">Widget en la sidebar de /news — equipos, hora, torneo</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            matchMeta.isActive !== false && hasTeams
              ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
              : 'bg-sp-admin-bg text-sp-admin-muted border-sp-admin-border'
          }`}>
            {matchMeta.isActive !== false && hasTeams ? '● Activo en /news' : '○ Inactivo'}
          </span>
        </div>

        <div className="p-5">
          <form action={updateFeaturedMatchAction}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Equipo A */}
              <div>
                <label className={LABEL}>Equipo A *</label>
                <input name="team1" className={INPUT} placeholder="9z Team" defaultValue={matchMeta.team1 ?? ''} />
              </div>

              {/* Equipo B */}
              <div>
                <label className={LABEL}>Equipo B *</label>
                <input name="team2" className={INPUT} placeholder="MOUZ" defaultValue={matchMeta.team2 ?? ''} />
              </div>

              {/* Torneo */}
              <div>
                <label className={LABEL}>Torneo</label>
                <input name="tournament" className={INPUT} placeholder="PGL Astana Major 2026" defaultValue={matchMeta.tournament ?? ''} />
              </div>

              {/* Logo A */}
              <div>
                <label className={LABEL}>Logo Equipo A (URL)</label>
                <input name="team1Logo" className={INPUT} placeholder="https://..." defaultValue={matchMeta.team1Logo ?? ''} />
              </div>

              {/* Logo B */}
              <div>
                <label className={LABEL}>Logo Equipo B (URL)</label>
                <input name="team2Logo" className={INPUT} placeholder="https://..." defaultValue={matchMeta.team2Logo ?? ''} />
              </div>

              {/* Estado manual */}
              <div>
                <label className={LABEL}>Estado (override manual)</label>
                <select name="matchStatus" defaultValue={matchMeta.matchStatus ?? ''} className={SELECT}>
                  <option value="">— Auto (derivado de fecha) —</option>
                  <option value="upcoming">PRÓXIMO</option>
                  <option value="live">EN VIVO</option>
                  <option value="finished">FINAL</option>
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className={LABEL}>Fecha</label>
                <input name="matchDate" type="date" className={INPUT} defaultValue={matchMeta.matchDate ?? ''} />
              </div>

              {/* Hora */}
              <div>
                <label className={LABEL}>Hora (local)</label>
                <input name="matchTime" type="time" className={INPUT} defaultValue={matchMeta.matchTime ?? ''} />
              </div>

              {/* Activar / desactivar */}
              <div className="flex items-end">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    value="on"
                    defaultChecked={matchMeta.isActive !== false}
                    className="w-4 h-4 accent-sp-orange rounded"
                  />
                  <span className="text-sm font-semibold text-sp-admin-text">Mostrar en /news</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-sp-admin-border">
              <button type="submit" className="px-5 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors">
                Guardar partido
              </button>
              <p className="text-xs text-sp-admin-muted">
                Los cambios se reflejan en /news en menos de 2 minutos.
              </p>
            </div>
          </form>

          {/* Preview — solo si hay equipos */}
          {hasTeams && (
            <div className="mt-6 pt-5 border-t border-sp-admin-border">
              <p className={LABEL}>Preview del widget</p>
              <div className="w-[260px] bg-[#070707] rounded-xl p-0.5">
                <FeaturedMatchCard meta={matchMeta} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info fallback */}
      <div className="mt-6 rounded-xl bg-sp-admin-bg border border-sp-admin-border px-4 py-3 text-xs text-sp-admin-muted">
        <strong className="text-sp-admin-text">Fallback automático:</strong>{' '}
        si un slot no tiene noticia asignada, el layout de <code>/news</code> usa las noticias más recientes.
        El partido solo aparece en sidebar si está activo y tiene ambos equipos.
      </div>
    </div>
  );
}
