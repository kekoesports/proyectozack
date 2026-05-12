import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllAgendaItems } from '@/lib/queries/agendaItems';
import { createAgendaItemAction, deleteAgendaItemAction } from './actions';
import { DeleteConfirmButton } from '../../giveaways/DeleteConfirmButton';

const inputCls = 'rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';

export default async function AgendaAdminPage() {
  await requirePermission('agenda', 'read');
  const items = await getAllAgendaItems();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">← Noticias</Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Agenda</h1>
      </div>
      <p className="text-sm text-sp-admin-muted mb-8">Partidos y eventos que aparecen en el widget Agenda del día de <code className="text-xs font-mono bg-sp-admin-bg px-1 py-0.5 rounded">/news</code>.</p>

      {/* Formulario crear */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Añadir evento</h2>
        <form action={createAgendaItemAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Título *</label>
            <input name="title" required className={`${inputCls} w-full`} placeholder="Gentle Mates vs MOUZ — Swiss R2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Torneo</label>
            <input name="tournament" className={`${inputCls} w-full`} placeholder="PGL Astana 2026" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Equipo A</label>
            <input name="team1" className={`${inputCls} w-full`} placeholder="Gentle Mates" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Equipo B</label>
            <input name="team2" className={`${inputCls} w-full`} placeholder="MOUZ" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Orden</label>
            <input name="sortOrder" type="number" min={0} defaultValue={0} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Fecha *</label>
            <input name="matchDate" type="date" required className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Hora (local)</label>
            <input name="matchTime" type="time" className={`${inputCls} w-full`} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-sp-admin-text cursor-pointer">
              <input name="isLive" type="checkbox" className="w-4 h-4 rounded accent-sp-orange" />
              EN DIRECTO
            </label>
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="px-5 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors">
              Añadir evento
            </button>
          </div>
        </form>
      </div>

      {/* Listado */}
      {items.length === 0 ? (
        <p className="text-sm text-sp-admin-muted">No hay eventos. Añade el primero.</p>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Equipos</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Torneo</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fecha / Hora</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Live</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-6 py-4 font-medium text-sp-admin-text">{item.title}</td>
                  <td className="px-4 py-4 text-sp-admin-muted text-xs">
                    {item.team1 && item.team2 ? `${item.team1} vs ${item.team2}` : item.team1 ?? item.team2 ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-sp-admin-muted text-xs">{item.tournament ?? '—'}</td>
                  <td className="px-4 py-4 text-sp-admin-muted text-xs">
                    {item.matchDate}{item.matchTime ? ` ${item.matchTime}` : ''}
                  </td>
                  <td className="px-4 py-4">
                    {item.isLive ? <span className="text-[10px] font-bold text-red-400 bg-red-900/20 px-2 py-0.5 rounded-full">LIVE</span> : <span className="text-[10px] text-sp-admin-muted">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <DeleteConfirmButton action={deleteAgendaItemAction} fields={{ id: item.id }} label={item.title.slice(0, 40)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
