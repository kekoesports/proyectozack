import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllRankingEntries } from '@/lib/queries/rankingEntries';
import { createRankingEntryAction, deleteRankingEntryAction } from './actions';
import { DeleteConfirmButton } from '../../giveaways/DeleteConfirmButton';

const inputCls = 'rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-orange/60 transition-colors';

export default async function RankingAdminPage() {
  await requirePermission('rankings', 'read');
  const entries = await getAllRankingEntries();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">← Noticias</Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Ranking Hispano</h1>
      </div>
      <p className="text-sm text-sp-admin-muted mb-8">
        Top 5 equipos que aparecen en el sidebar de <code className="text-xs font-mono bg-sp-admin-bg px-1 py-0.5 rounded">/news</code>.
        Ordena por posición (1 = primero).
      </p>

      {/* Formulario crear */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Añadir equipo</h2>
        <form action={createRankingEntryAction} className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Pos *</label>
            <input name="position" type="number" min={1} max={99} required className={`${inputCls} w-full`} placeholder="1" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Equipo *</label>
            <input name="teamName" required className={`${inputCls} w-full`} placeholder="Gentle Mates" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">País</label>
            <input name="country" maxLength={3} className={`${inputCls} w-full`} placeholder="ES" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Puntos</label>
            <input name="points" type="number" min={0} defaultValue={0} className={`${inputCls} w-full`} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors">
              Añadir
            </button>
          </div>
          <div className="col-span-2 md:col-span-6">
            <label className="block text-xs font-semibold text-sp-admin-muted uppercase tracking-wider mb-1">Logo URL (opcional)</label>
            <input name="teamLogo" type="url" className={`${inputCls} w-full`} placeholder="https://..." />
          </div>
        </form>
      </div>

      {/* Listado */}
      {entries.length === 0 ? (
        <p className="text-sm text-sp-admin-muted">No hay equipos. Añade el primero.</p>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Pos</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Equipo</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">País</th>
                <th className="text-right px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Puntos</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-4 py-3 font-display font-black text-sp-orange text-lg">{e.position}</td>
                  <td className="px-4 py-3 font-semibold text-sp-admin-text">{e.teamName}</td>
                  <td className="px-4 py-3 text-sp-admin-muted text-xs uppercase">{e.country ?? '—'}</td>
                  <td className="px-4 py-3 text-sp-admin-muted text-right tabular-nums">{e.points.toLocaleString('es-ES')}</td>
                  <td className="px-4 py-3">
                    <DeleteConfirmButton action={deleteRankingEntryAction} fields={{ id: e.id }} label={e.teamName} />
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
