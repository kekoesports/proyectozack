import Image from 'next/image';
import { requireAnyRole } from '@/lib/auth-guard';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { getAllTalentsLiveStatus } from '@/lib/queries/live';
import { setFeaturedLiveAction, setExcludeFromLiveAction, setFeaturedFallbackAction } from './actions';

export const dynamic = 'force-dynamic';

const MAX_FALLBACK = 10;

function formatTimeAgo(date: Date | null, now: number): string {
  if (!date) return '—';
  const diff = Math.round((now - date.getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)}m`;
  return `hace ${Math.round(diff / 3600)}h`;
}

function Toggle({ active, onClass = 'bg-sp-orange', offClass = 'bg-sp-admin-border' }: { active: boolean; onClass?: string; offClass?: string }) {
  return (
    <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? onClass : offClass}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${active ? 'left-4' : 'left-0.5'}`} />
    </div>
  );
}

export default async function AdminLivePage() {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const talents = await getAllTalentsLiveStatus();
  const now = new Date().getTime();

  const liveCount = talents.filter((t) => t.isLive).length;
  const fallbackCount = talents.filter((t) => t.featuredFallback).length;
  const lastCheck = talents.find((t) => t.lastCheckedAt)?.lastCheckedAt ?? null;

  return (
    <div>
      <AdminPageHeader
        title="En directo"
        stats={[
          { label: 'Live ahora', value: String(liveCount) },
          { label: 'En fallback', value: `${fallbackCount}/${MAX_FALLBACK}` },
          { label: 'Monitorizados', value: String(talents.length) },
        ]}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 text-xs text-sp-admin-muted">
          <span>Último check:</span>
          {formatTimeAgo(lastCheck, now)}
          <span className="text-sp-admin-muted/40">·</span>
          <span>Se actualiza automáticamente cada 3 min.</span>
        </div>

        {fallbackCount >= MAX_FALLBACK && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700 font-medium">
            Has alcanzado el máximo de {MAX_FALLBACK} streamers en el fallback. Desactiva alguno para añadir otro.
          </div>
        )}

        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Talento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Stream</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Destacado</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">
                  Fallback
                  <span className={`ml-1 text-[10px] font-bold ${fallbackCount >= MAX_FALLBACK ? 'text-amber-500' : 'text-sp-admin-muted/60'}`}>
                    {fallbackCount}/{MAX_FALLBACK}
                  </span>
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Excluir</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sp-admin-border">
              {talents.map((talent) => (
                <tr key={talent.id} className={talent.isLive ? 'bg-green-50/30' : ''}>
                  {/* Talento */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-sp-admin-border shrink-0">
                        {talent.photoUrl ? (
                          <Image src={talent.photoUrl} alt={talent.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-sp-admin-muted">
                            {talent.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-sp-admin-text text-sm">{talent.name}</span>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    {talent.isLive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        LIVE · {talent.platform?.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-sp-admin-muted">Offline</span>
                    )}
                  </td>

                  {/* Stream info */}
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-xs text-sp-admin-text truncate">{talent.gameName ?? talent.streamTitle ?? '—'}</p>
                    {talent.viewerCount != null && (
                      <p className="text-xs text-sp-admin-muted">{talent.viewerCount.toLocaleString()} viewers</p>
                    )}
                  </td>

                  {/* Toggle: Destacado live */}
                  <td className="px-3 py-3 text-center">
                    <form action={setFeaturedLiveAction.bind(null, talent.id, !talent.featuredLive)}>
                      <button type="submit" title={talent.featuredLive ? 'Quitar destacado' : 'Poner como destacado'}>
                        <Toggle active={talent.featuredLive} />
                      </button>
                    </form>
                  </td>

                  {/* Toggle: Fallback grid */}
                  <td className="px-3 py-3 text-center">
                    {!talent.featuredFallback && fallbackCount >= MAX_FALLBACK ? (
                      <span title={`Máximo ${MAX_FALLBACK} streamers`} className="opacity-30 cursor-not-allowed">
                        <Toggle active={false} onClass="bg-[#8b3aad]" />
                      </span>
                    ) : (
                      <form action={setFeaturedFallbackAction.bind(null, talent.id, !talent.featuredFallback, fallbackCount)}>
                        <button type="submit" title={talent.featuredFallback ? 'Quitar del fallback' : 'Añadir al fallback'}>
                          <Toggle active={talent.featuredFallback ?? false} onClass="bg-[#8b3aad]" />
                        </button>
                      </form>
                    )}
                  </td>

                  {/* Toggle: Excluir */}
                  <td className="px-3 py-3 text-center">
                    <form action={setExcludeFromLiveAction.bind(null, talent.id, !talent.excludeFromLive)}>
                      <button type="submit" title={talent.excludeFromLive ? 'Incluir' : 'Excluir de live'}>
                        <Toggle active={talent.excludeFromLive} onClass="bg-red-400" />
                      </button>
                    </form>
                  </td>

                  {/* Check */}
                  <td className="px-4 py-3 text-right">
                    {formatTimeAgo(talent.lastCheckedAt ?? null, now)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-sp-admin-muted space-y-1">
          <p><strong>Destacado:</strong> aparece como streamer principal cuando hay un directo activo.</p>
          <p><strong>Fallback ({MAX_FALLBACK} máx):</strong> aparece en la grid de &ldquo;Nuestros streamers&rdquo; cuando nadie está en directo. Si no hay ninguno seleccionado, se muestran los primeros del roster.</p>
          <p><strong>Excluir:</strong> el talento no aparece en la sección live aunque esté en directo.</p>
        </div>
      </div>
    </div>
  );
}
