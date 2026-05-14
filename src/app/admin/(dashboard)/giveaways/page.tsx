import Image from 'next/image';
import { requirePermission } from '@/lib/permissions';
import { getAllGiveaways } from '@/lib/queries/giveaways';
import { getAllTalents } from '@/lib/queries/talents';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import { deleteGiveawayAction, deleteAllDemosAction, setGiveawayFeaturedAction, setGiveawayBadgeAction, setGiveawayBadgeFromFormAction } from './actions';
import { deleteWinnerAction } from './winners-actions';
import { DeleteConfirmButton } from './DeleteConfirmButton';
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
  await requirePermission('sorteos', 'read');
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

      {/* Bulk delete demos */}
      {allGiveaways.some((g) => g.title.startsWith('[DEMO]')) && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 mb-4">
          <span className="text-xs font-bold text-amber-400">
            Hay sorteos [DEMO] visibles en el admin. No aparecen en la web pública.
          </span>
          <form action={deleteAllDemosAction} className="ml-auto">
            <button type="submit" className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-black hover:bg-amber-500/30 transition-colors">
              Eliminar todos los demos
            </button>
          </form>
        </div>
      )}

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
                <th className="text-center px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Destacado</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Badge</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Fin</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {giveaways.map((g) => (
                <tr key={g.id} className={`border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors ${g.title.startsWith('[DEMO]') ? 'bg-amber-500/5' : ''}`}>
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
                  {/* Toggle destacado */}
                  <td className="px-4 py-4 text-center">
                    <form action={setGiveawayFeaturedAction.bind(null, g.id, !g.isFeatured)}>
                      <button type="submit" title={g.isFeatured ? 'Quitar destacado' : 'Marcar como destacado'}>
                        <div className={`w-8 h-4 rounded-full relative transition-colors mx-auto ${g.isFeatured ? 'bg-sp-orange' : 'bg-sp-admin-border'}`}>
                          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${g.isFeatured ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>
                    </form>
                  </td>
                  {/* Badge */}
                  <td className="px-4 py-4">
                    {g.badge ? (
                      <form action={setGiveawayBadgeAction.bind(null, g.id, null)} className="flex items-center gap-1.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black bg-sp-orange/15 text-sp-orange border border-sp-orange/30">
                          {g.badge}
                        </span>
                        <button type="submit" className="text-[10px] text-sp-admin-muted hover:text-red-400 transition-colors" title="Quitar badge">✕</button>
                      </form>
                    ) : (
                      <form action={setGiveawayBadgeFromFormAction} className="flex items-center gap-1">
                        <input type="hidden" name="giveawayId" value={g.id} />
                        <select name="badge" defaultValue="" className="h-7 rounded-md border border-sp-admin-border bg-sp-admin-card px-2 text-[11px] text-sp-admin-muted outline-none">
                          <option value="" disabled>+ badge</option>
                          <option value="HOT">HOT</option>
                          <option value="NUEVO">NUEVO</option>
                          <option value="EXCLUSIVO">EXCLUSIVO</option>
                          <option value="TOP">TOP</option>
                          <option value="LIMITED">LIMITED</option>
                        </select>
                        <button type="submit" className="text-[10px] font-bold text-sp-admin-accent hover:underline">✓</button>
                      </form>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sp-admin-muted">
                    {g.endsAt ? new Date(g.endsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <EditGiveawayModal giveaway={g} />
                      <DeleteConfirmButton
                        action={deleteGiveawayAction}
                        fields={{ id: g.id, talentSlug: g.talent.slug }}
                        label={g.title.slice(0, 30)}
                      />
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
      <div id="crear-codigo" className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8 scroll-mt-6">
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
                    <DeleteConfirmButton
                      action={deleteWinnerAction}
                      fields={{ id: w.id }}
                      label={w.winnerName}
                    />
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
