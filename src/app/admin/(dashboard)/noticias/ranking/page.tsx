import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllRankingEntries } from '@/lib/queries/rankingEntries';
import { createRankingEntryAction } from './actions';
import { RankingTable } from './RankingTable';

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

      {/* Listado con edición inline */}
      <RankingTable entries={entries} />
    </div>
  );
}
