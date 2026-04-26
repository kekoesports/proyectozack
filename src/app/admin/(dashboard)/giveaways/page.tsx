import Image from 'next/image';
import { getAllGiveaways } from '@/lib/queries/giveaways';
import { getAllTalents } from '@/lib/queries/talents';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import { createGiveawayAction, deleteGiveawayAction } from './actions';
import { createCodeAction, deleteCodeAction } from './codes-actions';
import { createWinnerAction, deleteWinnerAction } from './winners-actions';

function isActive(endsAt: Date): boolean {
  return new Date(endsAt) > new Date();
}

type PageProps = {
  searchParams: Promise<{ creator?: string; status?: string }>;
}

export default async function AdminGiveawaysPage({ searchParams }: PageProps): Promise<React.ReactElement> {
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
        <form action={createGiveawayAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
            <select name="talentId" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
              <option value="">Seleccionar...</option>
              {allTalents.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Título del premio</label>
            <input name="title" required maxLength={200} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
            <input name="brandName" required maxLength={150} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Valor</label>
            <input name="value" maxLength={50} placeholder="1.250" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL del sorteo</label>
            <input name="redirectUrl" type="url" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Imagen del premio (URL)</label>
            <input name="imageUrl" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo de marca (URL)</label>
            <input name="brandLogo" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
            <input name="description" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Inicio</label>
            <input name="startsAt" type="datetime-local" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Fin</label>
            <input name="endsAt" type="datetime-local" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
              Crear Giveaway
            </button>
          </div>
        </form>
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
                    {new Date(g.endsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <form action={deleteGiveawayAction}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="talentSlug" value={g.talent.slug} />
                      <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-bold">
                        Eliminar
                      </button>
                    </form>
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
        <form action={createCodeAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
            <select name="talentId" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
              <option value="">Seleccionar...</option>
              {allTalents.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Código</label>
            <input name="code" required maxLength={100} placeholder="TODOCS2" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
            <input name="brandName" required maxLength={150} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL de redirección</label>
            <input name="redirectUrl" type="url" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo marca (URL)</label>
            <input name="brandLogo" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción (beneficio exacto)</label>
            <input name="description" maxLength={300} placeholder="100% extra en tu primer depósito" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">CTA personalizado</label>
            <input name="ctaText" maxLength={100} placeholder="Activar bonus" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Badge</label>
            <select name="badge" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
              <option value="">Sin badge</option>
              <option value="TOP">🔥 TOP</option>
              <option value="RECOMENDADO">⭐ Recomendado</option>
              <option value="MEJOR_BONUS">💎 Mejor bonus</option>
              <option value="NUEVO">✨ Nuevo</option>
              <option value="MAS_USADO">🚀 Más usado</option>
              <option value="EXCLUSIVO">👑 Exclusivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Categoría</label>
            <select name="category" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
              <option value="">Sin categoría</option>
              <option value="casino">Casino</option>
              <option value="apuestas">Apuestas</option>
              <option value="skins_cs2">Skins CS2</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" name="isFeatured" id="isFeatured" className="rounded" />
            <label htmlFor="isFeatured" className="text-sm font-semibold text-sp-admin-muted">
              Destacado (aparece en sección &ldquo;Mejores recompensas&rdquo;)
            </label>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
              Crear Código
            </button>
          </div>
        </form>
      </div>

      {/* Codes list */}
      {allCodes.length === 0 ? (
        <p className="text-sm text-sp-admin-muted">No hay códigos. Crea el primero.</p>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Código</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Creador</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Marca</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Badge</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Categ.</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Dest.</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allCodes.map((c) => (
                <tr key={c.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-sp-admin-text">{c.code}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{c.talent.name}</td>
                  <td className="px-6 py-4 text-sp-admin-muted">{c.brandName}</td>
                  <td className="px-6 py-4 text-sp-admin-muted text-xs">{c.badge ?? '—'}</td>
                  <td className="px-6 py-4 text-sp-admin-muted text-xs">{c.category ?? '—'}</td>
                  <td className="px-6 py-4">
                    {c.isFeatured && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 text-amber-400">★</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <form action={deleteCodeAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300 text-xs font-bold">Eliminar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Winners section */}
      <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text mb-8 mt-16">Ganadores</h1>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 mb-8">
        <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text mb-4">Registrar Ganador</h2>
        <form action={createWinnerAction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Sorteo</label>
            <select name="giveawayId" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
              <option value="">Seleccionar...</option>
              {allGiveaways.map((g) => (
                <option key={g.id} value={g.id}>{g.title} ({g.talent.name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Nombre del ganador</label>
            <input name="winnerName" required maxLength={100} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Avatar (URL)</label>
            <input name="winnerAvatar" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
              Registrar Ganador
            </button>
          </div>
        </form>
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
