import Image from 'next/image';
import { requireAnyRole } from '@/lib/auth-guard';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { getAllTalentsLiveStatus } from '@/lib/queries/live';
import { setFeaturedLiveAction, setExcludeFromLiveAction } from './actions';

export const dynamic = 'force-dynamic';

function TimeAgo({ date }: { date: Date | null }) {
  if (!date) return <span className="text-sp-admin-muted text-xs">—</span>;
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  const label = diff < 60 ? `hace ${diff}s` : diff < 3600 ? `hace ${Math.round(diff / 60)}m` : `hace ${Math.round(diff / 3600)}h`;
  return <span className="text-sp-admin-muted text-xs">{label}</span>;
}

export default async function AdminLivePage() {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const talents = await getAllTalentsLiveStatus();

  const liveCount = talents.filter((t) => t.isLive).length;
  const lastCheck = talents.find((t) => t.lastCheckedAt)?.lastCheckedAt ?? null;

  return (
    <div>
      <AdminPageHeader
        title="En directo"
        stats={[
          { label: 'Live ahora', value: String(liveCount) },
          { label: 'Talentos monitorizados', value: String(talents.length) },
        ]}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {/* Info bar */}
        <div className="flex items-center gap-3 text-xs text-sp-admin-muted">
          <span>Último check:</span>
          <TimeAgo date={lastCheck} />
          <span className="text-sp-admin-muted/40">·</span>
          <span>Los datos se actualizan automáticamente cada 3 min cuando alguien visita la web.</span>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Talento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Juego / Título</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Destacado</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">Excluir</th>
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
                      <span className="font-medium text-sp-admin-text">{talent.name}</span>
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

                  {/* Juego / Título */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs text-sp-admin-text truncate">{talent.gameName ?? talent.streamTitle ?? '—'}</p>
                    {talent.viewerCount != null && (
                      <p className="text-xs text-sp-admin-muted">{talent.viewerCount.toLocaleString()} espectadores</p>
                    )}
                  </td>

                  {/* Toggle: Featured */}
                  <td className="px-4 py-3 text-center">
                    <form action={setFeaturedLiveAction.bind(null, talent.id, !talent.featuredLive)}>
                      <button
                        type="submit"
                        className={`w-8 h-4 rounded-full transition-colors relative ${talent.featuredLive ? 'bg-sp-orange' : 'bg-sp-admin-border'}`}
                        title={talent.featuredLive ? 'Quitar destacado' : 'Poner como destacado'}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${talent.featuredLive ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </form>
                  </td>

                  {/* Toggle: Excluir */}
                  <td className="px-4 py-3 text-center">
                    <form action={setExcludeFromLiveAction.bind(null, talent.id, !talent.excludeFromLive)}>
                      <button
                        type="submit"
                        className={`w-8 h-4 rounded-full transition-colors relative ${talent.excludeFromLive ? 'bg-red-400' : 'bg-sp-admin-border'}`}
                        title={talent.excludeFromLive ? 'Incluir en live' : 'Excluir de live'}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${talent.excludeFromLive ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </form>
                  </td>

                  {/* Check */}
                  <td className="px-4 py-3 text-right">
                    <TimeAgo date={talent.lastCheckedAt ?? null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-sp-admin-muted">
          <strong>Destacado:</strong> el talento con este toggle activo aparece como streamer principal en la web, independientemente de viewers. Si hay varios activados, prevalece el de más viewers. Si ninguno está activo, se usa el de más viewers automáticamente.
          <br />
          <strong>Excluir:</strong> el talento no aparecerá en la sección live aunque esté en directo.
        </p>
      </div>
    </div>
  );
}
