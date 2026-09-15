import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { newsletterSends } from '@/db/schema';
import { getPublishedNewsPostsForAdmin } from '@/lib/queries/editorialSlots';
import { getNewsletterStats } from '@/lib/queries/newsletterSubscribers';
import { SendNewsletterButton } from '../SendNewsletterButton';

export default async function NewsletterPage(): Promise<React.ReactElement> {
  await requirePermission('noticias', 'read');
  const [news, stats, sends] = await Promise.all([
    getPublishedNewsPostsForAdmin(), getNewsletterStats(),
    db.select({ postId: newsletterSends.postId }).from(newsletterSends),
  ]);
  const sentIds = new Set(sends.map((send) => send.postId));
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Boletín de suscriptores</h1>
      <p className="text-sm text-sp-admin-muted">Noticias de la web para quienes se han suscrito al boletín. Las propuestas a periódicos, medios y páginas de anuncios se gestionan en Prensa y difusión.</p>
      <nav className="flex flex-wrap gap-5 text-sm font-semibold text-sp-admin-accent" aria-label="Secciones de comunicación">
        <Link href="/admin/noticias">Noticias de la web</Link>
        <Link href="/admin/noticias/suscriptores">Gestionar suscriptores</Link>
        <Link href="/admin/prensa-targets">Prensa y difusión</Link>
      </nav>
      {news.length === 0 && <p className="text-sm text-sp-admin-muted">Todavía no hay noticias publicadas para compartir.</p>}
      <ul className="space-y-3">
        {news.map((post) => (
          <li key={post.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sp-admin-border bg-sp-admin-card p-5">
            <Link href={`/news/${post.slug}`} className="font-semibold text-sp-admin-text">{post.title}</Link>
            <SendNewsletterButton postId={post.id} postTitle={post.title} totalSubscribers={stats.total} alreadySent={sentIds.has(post.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
