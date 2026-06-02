import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllNewsPostsForAdmin } from '@/lib/queries/editorialSlots';

export default async function AdminEstadisticasPage() {
  await requirePermission('noticias', 'read');

  const [statsPosts, reportesPosts] = await Promise.all([
    getAllNewsPostsForAdmin('estadisticas'),
    // reportes se gestionan con tags hasta que haya volumen — por ahora vacío
    Promise.resolve([] as Awaited<ReturnType<typeof getAllNewsPostsForAdmin>>),
  ]);

  const totalContent = statsPosts.length + reportesPosts.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Estadísticas</h1>
        <Link
          href="/admin/noticias/new"
          className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors"
        >
          + Nuevo artículo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Ranking de equipos */}
        <Link
          href="/admin/noticias/ranking"
          className="group rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 hover:border-sp-orange/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sp-admin-muted">Ranking de equipos</p>
            <span className="text-sp-admin-muted/40 group-hover:text-sp-orange transition-colors text-lg">→</span>
          </div>
          <p className="text-2xl font-black text-sp-admin-text font-display">CRUD</p>
          <p className="text-xs text-sp-admin-muted mt-1">Gestionar posiciones, puntos y logos</p>
        </Link>

        {/* Artículos de estadísticas */}
        <Link
          href="/admin/noticias?type=estadisticas"
          className="group rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 hover:border-sp-orange/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sp-admin-muted">Artículos publicados</p>
            <span className="text-sp-admin-muted/40 group-hover:text-sp-orange transition-colors text-lg">→</span>
          </div>
          <p className="text-2xl font-black text-sp-admin-text font-display">{totalContent}</p>
          <p className="text-xs text-sp-admin-muted mt-1">Con tipo «Estadística»</p>
        </Link>

        {/* Datos Twitch — enlace a En directo */}
        <Link
          href="/admin/live"
          className="group rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6 hover:border-sp-orange/40 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-sp-admin-muted">Audiencias Twitch</p>
            <span className="text-sp-admin-muted/40 group-hover:text-sp-orange transition-colors text-lg">→</span>
          </div>
          <p className="text-2xl font-black text-sp-admin-text font-display">Live</p>
          <p className="text-xs text-sp-admin-muted mt-1">Estado de directos y viewers</p>
        </Link>
      </div>

      {/* Lista de artículos de estadísticas */}
      {statsPosts.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sp-admin-muted mb-3">Últimos artículos de estadísticas</h2>
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                  <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Publicación</th>
                  <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {statsPosts.map((p) => (
                  <tr key={p.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sp-admin-text line-clamp-1">{p.title}</p>
                      <p className="text-[11px] text-sp-admin-muted font-mono mt-0.5">/news/{p.slug}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.status === 'published' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-sp-admin-border text-sp-admin-muted'
                      }`}>
                        {p.status === 'published' ? 'Publicada' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sp-admin-muted text-xs">
                      {p.publishedAt
                        ? new Date(p.publishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/noticias/${p.id}/edit`}
                        className="text-xs font-semibold text-sp-admin-accent hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {statsPosts.length === 0 && (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-12 text-center">
          <p className="text-sp-admin-muted text-sm mb-2">Aún no hay artículos de estadísticas.</p>
          <p className="text-sp-admin-muted/60 text-xs mb-4">
            Al crear un artículo en Noticias, selecciona «Estadística» como tipo de contenido.
          </p>
          <Link
            href="/admin/noticias/new"
            className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors"
          >
            Crear el primero
          </Link>
        </div>
      )}
    </div>
  );
}
