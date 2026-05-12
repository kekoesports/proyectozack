import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllMatches } from '@/lib/queries/matches';
import { deleteMatchAction, setMatchFeaturedAction, toggleMatchActiveAction } from './actions';

function formatMatchDate(date?: string | null, time?: string | null) {
  if (!date) return '—';
  const d = new Date(`${date}T${time ?? '12:00'}:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) + (time ? ` ${time}` : '');
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'PRÓXIMO', cls: 'bg-white/[0.06] text-white/50 border-white/10' },
  live:     { label: 'EN VIVO', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  finished: { label: 'FINAL',   cls: 'bg-white/[0.04] text-white/25 border-white/[0.06]' },
};

export default async function PartidosPage() {
  await requirePermission('noticias', 'publish');
  const allMatches = await getAllMatches();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-sp-admin-muted mb-1">
            <Link href="/admin/noticias" className="hover:text-sp-admin-text transition-colors">Noticias</Link>
            <span>/</span>
            <span>Partidos</span>
          </div>
          <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Partidos</h1>
        </div>
        <Link href="/admin/noticias/partidos/new"
          className="h-9 px-4 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:bg-sp-admin-accent/90 transition-colors flex items-center gap-1.5">
          + Nuevo partido
        </Link>
      </div>

      {allMatches.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-12 text-center">
          <p className="text-sm text-sp-admin-muted mb-3">No hay partidos todavía.</p>
          <Link href="/admin/noticias/partidos/new"
            className="text-sm font-semibold text-sp-admin-accent hover:opacity-70">
            Crear primer partido →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                {['Partido', 'Torneo', 'Fecha', 'Estado', 'Activo', 'Destacado', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-admin-border/50">
              {allMatches.map((m) => {
                const badge = STATUS_LABELS[m.matchStatus ?? 'upcoming'] ?? STATUS_LABELS['upcoming'] ?? { label: 'PRÓXIMO', cls: 'bg-white/[0.06] text-white/50 border-white/10' };
                return (
                  <tr key={m.id} className="hover:bg-sp-admin-hover transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-sp-admin-text">
                        {m.team1} <span className="text-sp-admin-muted font-normal">vs</span> {m.team2}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sp-admin-muted text-xs">{m.tournament ?? '—'}</td>
                    <td className="px-4 py-3 text-sp-admin-muted text-xs font-mono whitespace-nowrap">
                      {formatMatchDate(m.matchDate, m.matchTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-black uppercase ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <form action={toggleMatchActiveAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="current" value={String(m.isActive)} />
                        <button type="submit" title={m.isActive ? 'Desactivar' : 'Activar'}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                            m.isActive
                              ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                              : 'bg-sp-admin-bg border-sp-admin-border text-sp-admin-muted'
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${m.isActive ? 'bg-emerald-400' : 'bg-sp-admin-muted/30'}`} />
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      {m.isFeatured ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sp-orange">
                          ★ En sidebar
                        </span>
                      ) : (
                        <form action={setMatchFeaturedAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <button type="submit"
                            className="text-[10px] text-sp-admin-muted hover:text-sp-orange transition-colors font-semibold">
                            Destacar →
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/noticias/partidos/${m.id}/edit`}
                          className="text-[11px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                          Editar
                        </Link>
                        <form action={deleteMatchAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <button type="submit"
                            className="text-[11px] font-semibold text-red-400/60 hover:text-red-400 transition-colors">
                            Borrar
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-sp-admin-muted">
        Solo un partido puede estar <strong className="text-sp-orange">destacado</strong> a la vez — ese es el que aparece en la sidebar de /news.
        El partido debe además estar <strong className="text-sp-admin-text">activo</strong> para mostrarse.
      </div>
    </div>
  );
}
