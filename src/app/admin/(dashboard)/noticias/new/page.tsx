import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { createPostAction } from '../actions';
import { PostForm } from '../PostForm';

type Props = { searchParams?: Promise<Record<string, string>> };

export default async function NewNoticiaPage({ searchParams }: Props) {
  await requirePermission('noticias', 'write');
  const params = await searchParams;
  const vertical = params?.vertical === 'blog' ? 'blog' : 'news';
  const requestedDate = params?.publishedAt ? new Date(params.publishedAt) : null;
  const publishedAt = requestedDate && !Number.isNaN(requestedDate.getTime()) ? requestedDate : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">
          ← Noticias
        </Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">
          {vertical === 'blog' ? 'Nuevo blog' : 'Nueva noticia'}
        </h1>
      </div>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6">
        <PostForm
          post={{ vertical, publishedAt, status: publishedAt ? 'published' : 'draft' }}
          action={createPostAction}
          submitLabel={vertical === 'blog' ? 'Crear blog' : 'Crear noticia'}
        />
      </div>
    </div>
  );
}
