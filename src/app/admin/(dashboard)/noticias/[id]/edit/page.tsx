import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import { updatePostAction } from '../../actions';
import { PostForm } from '../../PostForm';

type Props = { params: Promise<{ id: string }> };

export default async function EditNoticiaPage({ params }: Props) {
  await requireAnyRole(['admin', 'manager'], '/admin/login');
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) notFound();

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/noticias" className="text-sp-admin-muted hover:text-sp-admin-text transition-colors text-sm">
          ← Noticias
        </Link>
        <span className="text-sp-admin-border">/</span>
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text line-clamp-1">{post.title}</h1>
      </div>

      <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-6">
        <PostForm
          post={{
            ...post,
            tags: post.tags as string[],
            talentSlugs: post.talentSlugs as string[] | null,
            blocksJson: post.blocksJson,
          }}
          action={updatePostAction}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
