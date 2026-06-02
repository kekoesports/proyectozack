import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { getPostAnalyticsDetail } from '@/lib/queries/postAnalytics';
import { db } from '@/lib/db';
import { posts } from '@/db/schema/posts';
import { eq } from 'drizzle-orm';
import { readTime } from '@/lib/utils/blog';

type PageProps = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { postId } = await params;
  const [post] = await db.select({ title: posts.title }).from(posts).where(eq(posts.id, Number(postId))).limit(1);
  return { title: post ? `${post.title} — Analytics | Admin` : 'Analytics | Admin' };
}

function StatCard({ label, value, accent = '#8b3aad' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3.5">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sp-admin-muted">{label}</p>
        <p className="text-[20px] font-bold tabular-nums mt-1 leading-none" style={{ color: accent }}>
          {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
        </p>
      </div>
    </div>
  );
}

function MiniTable<T extends Record<string, unknown>>({
  title, rows, cols,
}: {
  title: string;
  rows: T[];
  cols: { key: keyof T; label: string; right?: boolean }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-sp-admin-border bg-sp-admin-hover/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">{title}</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-sp-admin-border">
            {cols.map((c) => (
              <th key={String(c.key)} className={`px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted ${c.right ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-admin-border/40">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-sp-admin-hover transition-colors">
              {cols.map((c) => {
                const val = row[c.key];
                const display = val == null || val === '' ? '—' : typeof val === 'number' ? val.toLocaleString('es-ES') : String(val);
                return (
                  <td key={String(c.key)} className={`px-3 py-2 text-[11px] ${c.right ? 'text-right tabular-nums font-bold text-sp-orange' : 'text-sp-admin-text'}`}>
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PostAnalyticsDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  await requirePermission('analytics', 'read');
  const { postId: postIdStr } = await params;
  const postId = Number(postIdStr);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  const [postRow] = await db
    .select({ id: posts.id, title: posts.title, slug: posts.slug, vertical: posts.vertical, bodyMd: posts.bodyMd, publishedAt: posts.publishedAt })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!postRow) notFound();

  const detail = await getPostAnalyticsDetail(postId);
  const readMins = readTime(postRow.bodyMd);
  const articleUrl = `/${postRow.vertical}/${postRow.slug}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/admin/analytics" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors">← Analítica</Link>
        <span className="text-sp-admin-border">/</span>
        <Link href="/admin/analytics/news" className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors">Editorial</Link>
        <span className="text-sp-admin-border">/</span>
        <span className="text-[11px] text-sp-admin-text font-medium truncate max-w-[280px]">{postRow.title}</span>
      </div>

      {/* Header artículo */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mb-2 ${
              postRow.vertical === 'news' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {postRow.vertical}
            </span>
            <h1 className="text-[15px] font-bold text-sp-admin-text leading-snug">{postRow.title}</h1>
            <p className="text-[11px] text-sp-admin-muted mt-1">{articleUrl} · {readMins} min lectura</p>
          </div>
          <Link
            href={articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-sp-admin-accent hover:underline shrink-0"
          >
            Ver artículo ↗
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Visitas totales"        value={detail.totalViews}     accent="#8b3aad" />
        <StatCard label="Últimos 30 días"         value={detail.views30d}       accent="#5b9bd5" />
        <StatCard label="Últimos 7 días"          value={detail.views7d}        accent="#f5632a" />
        <StatCard label="Visitantes únicos (apr.)" value={detail.uniqueVisitors} accent="#e03070" />
      </div>

      {detail.totalViews === 0 && (
        <div className="rounded-xl border border-dashed border-sp-admin-border bg-sp-admin-card p-10 text-center">
          <p className="text-[12px] text-sp-admin-muted">Este artículo aún no tiene visitas registradas.</p>
        </div>
      )}

      {detail.totalViews > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MiniTable
            title="Por país"
            rows={detail.byCountry}
            cols={[
              { key: 'country', label: 'País' },
              { key: 'views',   label: 'Visitas', right: true },
            ]}
          />
          <MiniTable
            title="Por dispositivo"
            rows={detail.byDevice}
            cols={[
              { key: 'device', label: 'Dispositivo' },
              { key: 'views',  label: 'Visitas', right: true },
            ]}
          />
          <MiniTable
            title="Por referrer"
            rows={detail.byReferrer}
            cols={[
              { key: 'referrerHost', label: 'Origen' },
              { key: 'views',        label: 'Visitas', right: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}
