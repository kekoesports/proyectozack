import Image from 'next/image';
import { requireAnyRole } from '@/lib/auth-guard';
import { getAllGiveaways } from '@/lib/queries/giveaways';
import { getAllTalents } from '@/lib/queries/talents';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import { deleteGiveawayAction } from './actions';
import { deleteWinnerAction } from './winners-actions';
import { EditGiveawayModal } from './EditGiveawayModal';
import { CreateGiveawayForm } from './CreateGiveawayForm';
import { CreateCodeForm } from './CreateCodeForm';
import { CreateWinnerForm } from './CreateWinnerForm';
import { CodesTable } from './CodesTable';

function isActive(endsAt: Date | null): boolean {
  return endsAt === null || new Date(endsAt) > new Date();
}

type PageProps = {
  searchParams: Promise<{ creator?: string; status?: string }>;
}

export default async function AdminGiveawaysPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const { creator, status } = await searchParams;
  const [allGiveaways, allTalents, allCodes, allWinners] = await Promise.all([
    getAllGiveaways(),
    getAllTalents(),
    getAllCodes(),
    getAllWinners(),
  ]);

  let giveaways = allGiveaways;
  if (creator) {
    giveaways = giveaways.filter((g) => g.talent.slug === creator);
  }
  if (status === 'active') {
    giveaways = giveaways.filter((g) => isActive(g.endsAt));
  } else if (status === 'finished') {
    giveaways = giveaways.filter((g) => !isActive(g.endsAt));
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text mb-8">Giveaways</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <form className="flex gap-3">
          <select name="creator" defaultValue={creator ?? ''} className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-2 text-sm text-sp-admin-text">
            <option value="">Todos los creadores</option>
            {allTalents.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ''} className="rounded-lg border border-sp-admin-border bg-sp-admin-card px-3 py-2 text-sm text-sp-admin-text">
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="finished">Finalizado</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-sp-admin-hover text-sp-admin-text text-sm font-semibold hover:bg-sp-admin-border/30 transition-colors">
            Filtrar
          </button>
        </form>
      </div>

      {/* Create form */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Crear Giveaway</h2>
        <CreateGiveawayForm talents={allTalents} />
      </div>

      {/* List */}
      {giveaways.length === 0 ? (
        <p className="text-sm text-sp-admin-muted">No hay giveaways. Crea el primero.</p>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Imagen</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Premio</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Creador</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Marca</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Valor</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fin</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {giveaways.map((g) => (
                <tr key={g.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-6 py-4">
                    {g.imageUrl ? (
                      <Image src={g.imageUrl} alt={g.title} width={48} height={36} className="rounded object-contain bg-sp-admin-bg" />
                    ) : (
                      <div className="w-12 h-9 rounded bg-sp-admin-bg flex items-center justify-center text-sp-admin-muted text-xs">--</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-sp-admin-text">{g.title}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{g.talent.name}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{g.brandName}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{g.value || '--'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                      isActive(g.endsAt) ? 'bg-emerald-900/30 text-emerald-400' : 'bg-sp-admin-border text-sp-admin-muted'
                    }`}>
                      {isActive(g.endsAt) ? 'Activo' : 'Finalizado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sp-admin-muted">
                    {g.endsAt ? new Date(g.endsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <EditGiveawayModal giveaway={g} />
                      <form action={deleteGiveawayAction}>
                        <input type="hidden" name="id" value={g.id} />
                        <input type="hidden" name="talentSlug" value={g.talent.slug} />
                        <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-bold">
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Codes section */}
      <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text mb-8 mt-16">Códigos de Creadores</h1>

      {/* Create code form */}
      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Crear Código</h2>
        <CreateCodeForm talents={allTalents} />
      </div>

      {/* Codes list */}
      <CodesTable
        codes={allCodes}
        talents={allTalents.map((t) => ({ id: t.id, name: t.name }))}
      />

      {/* Winners section */}
      <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text mb-8 mt-16">Ganadores</h1>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Registrar Ganador</h2>
        <CreateWinnerForm giveaways={allGiveaways} />
      </div>

      {allWinners.length === 0 ? (
        <p className="text-sm text-sp-admin-muted">No hay ganadores registrados.</p>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Ganador</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Sorteo</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allWinners.map((w) => (
                <tr key={w.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-6 py-4 font-medium text-sp-admin-text">{w.winnerName}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{w.giveaway.title}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{new Date(w.wonAt).toLocaleDateString('es-ES')}</td>
                  <td className="px-6 py-4">
                    <form action={deleteWinnerAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-bold">Eliminar</button>
                    </form>
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
