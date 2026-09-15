import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { posts } from '@/db/schema/posts';
import { pressOutreachCondition } from '@/lib/queries/content-channel';
import { PressDraftIdSchema } from '@/lib/schemas/press-drafts';
import { PressDraftForm } from '../PressDraftForm';

export default async function PressDraftPage({ params }: { readonly params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  await requirePermission('prensa_targets', 'write');
  const parsed = PressDraftIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const [draft] = await db.select({ id: posts.id, title: posts.title, excerpt: posts.excerpt, bodyMd: posts.bodyMd, author: posts.author })
    .from(posts).where(and(eq(posts.id, parsed.data.id), pressOutreachCondition)).limit(1);
  if (!draft) notFound();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Propuesta para medios</h1>
      <p className="text-sm text-sp-admin-muted">Documento interno de Prensa y difusión. Guardar conserva el borrador; no publica en la web ni envía correos.</p>
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-6"><PressDraftForm draft={draft} /></div>
    </div>
  );
}
