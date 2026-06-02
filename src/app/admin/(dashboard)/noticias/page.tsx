import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { getAllNewsPostsForAdmin } from '@/lib/queries/editorialSlots';
import { getNewsletterStats } from '@/lib/queries/newsletterSubscribers';
import { db } from '@/lib/db';
import { newsletterSends } from '@/db/schema';
import { deletePostVoidAction } from './actions';
import { DeleteConfirmButton } from '../giveaways/DeleteConfirmButton';
import { SendNewsletterButton } from './SendNewsletterButton';

type ContentType = 'noticias' | 'analisis' | 'estadisticas';

const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; cls: string }> = {
  noticias:    { label: 'Noticia',     cls: 'bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border' },
  analisis:    { label: 'Análisis',    cls: 'bg-blue-900/30 text-blue-400' },
  estadisticas:{ label: 'Estadística', cls: 'bg-sp-orange/20 text-sp-orange' },
};

function statusLabel(status: string, publishedAt: Date | null) {
  if (status === 'draft') return { label: 'Borrador', cls: 'bg-sp-admin-border text-sp-admin-muted' };
  if (publishedAt && publishedAt > new Date()) return { label: 'Programada', cls: 'bg-amber-900/30 text-amber-400' };
  return { label: 'Publicada', cls: 'bg-emerald-900/30 text-emerald-400' };
}

type Props = { searchParams?: Promise<Record<string, string>> };

export default async function AdminNoticiasPage({ searchParams }: Props) {
  await requirePermission('noticias', 'read');
  const params = await searchParams;
  const rawType = params?.type;
  const activeType: ContentType | undefined =
    rawType === 'noticias' || rawType === 'analisis' || rawType === 'estadisticas'
      ? rawType
      : undefined;

  const [allPosts, nlStats, existingSends] = await Promise.all([
    getAllNewsPostsForAdmin(activeType),
    getNewsletterStats(),
    db.select({ postId: newsletterSends.postId, status: newsletterSends.status }).from(newsletterSends),
  ]);
  const sentPostIds = new Set(existingSends.map((s) => s.postId));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Noticias</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/noticias/agenda"
            className="px-4 py-2 rounded-lg border border-sp-admin-border text-sp-admin-muted text-sm font-semibold hover:bg-sp-admin-hover transition-colors"
          >
            Agenda
          </Link>
          <Link
            href="/admin/noticias/partidos"
            className="px-4 py-2 rounded-lg border border-sp-admin-border text-sp-admin-muted text-sm font-semibold hover:bg-sp-admin-hover transition-colors"
          >
            Partidos
          </Link>
          <Link
            href="/admin/noticias/slots"
            className="px-4 py-2 rounded-lg border border-sp-admin-border text-sp-admin-muted text-sm font-semibold hover:bg-sp-admin-hover transition-colors"
          >
            Slots editoriales
          </Link>
          <Link
            href="/admin/noticias/suscriptores"
            className="px-4 py-2 rounded-lg border border-sp-admin-border text-sp-admin-muted text-sm font-semibold hover:bg-sp-admin-hover transition-colors"
          >
            Suscriptores
          </Link>
          <Link
            href="/admin/noticias/new"
            className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors"
          >
            + Nueva noticia
          </Link>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex items-center gap-2 mb-6">
        {([undefined, 'noticias', 'analisis', 'estadisticas'] as const).map((t) => {
          const isActive = activeType === t;
          const href = t ? `/admin/noticias?type=${t}` : '/admin/noticias';
          const label = t ? CONTENT_TYPE_LABELS[t].label : 'Todos';
          return (
            <Link
              key={t ?? 'all'}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-sp-orange text-white'
                  : 'border border-sp-admin-border text-sp-admin-muted hover:bg-sp-admin-hover'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {allPosts.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-12 text-center">
          <p className="text-sp-admin-muted text-sm mb-4">No hay noticias todavía.</p>
          <Link href="/admin/noticias/new" className="px-4 py-2 rounded-lg bg-sp-orange text-white text-sm font-bold hover:bg-sp-orange/90 transition-colors">
            Crear la primera
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Título</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Publicación</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Autor</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Tags</th>
                <th className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Newsletter</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allPosts.map((p) => {
                const { label, cls } = statusLabel(p.status, p.publishedAt);
                const ct = (p.contentType ?? 'noticias') as ContentType;
                const { label: ctLabel, cls: ctCls } = CONTENT_TYPE_LABELS[ct];
                return (
                  <tr key={p.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sp-admin-text line-clamp-1">{p.title}</p>
                      <p className="text-[11px] text-sp-admin-muted font-mono mt-0.5">/news/{p.slug}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${ctCls}`}>{ctLabel}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>
                    </td>
                    <td className="px-4 py-4 text-sp-admin-muted text-xs">
                      {p.publishedAt
                        ? new Date(p.publishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-sp-admin-muted text-xs">{p.author}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {((p.tags as string[]) ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {p.status === 'published' ? (
                        <SendNewsletterButton
                          postId={p.id}
                          postTitle={p.title}
                          totalSubscribers={nlStats.total}
                          alreadySent={sentPostIds.has(p.id)}
                        />
                      ) : (
                        <span className="text-[11px] text-sp-admin-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/noticias/${p.id}/edit`}
                          className="text-xs font-semibold text-sp-admin-accent hover:underline"
                        >
                          Editar
                        </Link>
                        <a
                          href={`/news/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
                        >
                          Ver →
                        </a>
                        <DeleteConfirmButton
                          action={deletePostVoidAction}
                          fields={{ id: p.id }}
                          label={p.title.slice(0, 40)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
