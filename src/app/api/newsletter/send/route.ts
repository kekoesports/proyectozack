'use server';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { newsletterSubscribers, newsletterSends, posts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { isRole, IS_DEV } from '@/lib/auth-guard';
import { PERMISSIONS } from '@/lib/permissions';
import { sendNewsletterPostEmail } from '@/lib/email';

const schema = z.object({
  postId: z.number().int().positive(),
});

const SEND_DELAY_MS = 120; // pacing para no superar rate limits de Resend

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function getAuthorizedUser(): Promise<{ id: string; email: string } | null> {
  if (IS_DEV) return { id: 'dev', email: 'dev@localhost' };
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) return null;
  const rawRole = (session.user as { role?: string | null }).role;
  const role = isRole(rawRole) ? rawRole : null;
  if (!role) return null;
  const allowed = PERMISSIONS.noticias.publish as readonly string[];
  if (!allowed.includes(role)) return null;
  return { id: session.user.id, email: session.user.email };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthorizedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'postId inválido.' }, { status: 400 });
  }

  const { postId } = parsed.data;

  // Verificar que el post existe y está publicado
  const [post] = await db
    .select({ id: posts.id, title: posts.title, excerpt: posts.excerpt, slug: posts.slug, coverUrl: posts.coverUrl, author: posts.author, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: 'Noticia no encontrada.' }, { status: 404 });
  }
  if (post.status !== 'published') {
    return NextResponse.json({ error: 'La noticia debe estar publicada para enviarla.' }, { status: 422 });
  }

  // Idempotencia — unique constraint en postId
  try {
    await db.insert(newsletterSends).values({
      postId,
      status:    'sending',
      sentBy:    user.email,
      startedAt: new Date(),
    });
  } catch {
    // Unique constraint hit → ya existe un envío para este post
    const [existing] = await db
      .select({ status: newsletterSends.status, recipientCount: newsletterSends.recipientCount })
      .from(newsletterSends)
      .where(eq(newsletterSends.postId, postId))
      .limit(1);
    return NextResponse.json(
      { error: `Ya existe un envío para esta noticia (estado: ${existing?.status ?? 'desconocido'}).` },
      { status: 409 }
    );
  }

  // Obtener suscriptores activos con consentNewsletter
  const subscribers = await db
    .select({ email: newsletterSubscribers.email, unsubscribeToken: newsletterSubscribers.unsubscribeToken })
    .from(newsletterSubscribers)
    .where(and(
      eq(newsletterSubscribers.status, 'active'),
      eq(newsletterSubscribers.consentNewsletter, true),
    ));

  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers) {
    if (!sub.unsubscribeToken) continue;
    try {
      await sendNewsletterPostEmail({
        email:       sub.email,
        unsubToken:  sub.unsubscribeToken,
        postTitle:   post.title,
        postExcerpt: post.excerpt,
        postSlug:    post.slug,
        coverUrl:    post.coverUrl,
        author:      post.author,
      });
      sent++;
    } catch (err) {
      errors.push(sub.email);
      console.error(`[newsletter] Error en envío (destinatario ${sent + errors.length} de ${subscribers.length}):`, err instanceof Error ? err.message : 'unknown');
    }
    await sleep(SEND_DELAY_MS);
  }

  const finalStatus = errors.length === subscribers.length && subscribers.length > 0 ? 'failed' : 'sent';

  await db
    .update(newsletterSends)
    .set({
      status:         finalStatus,
      recipientCount: sent,
      completedAt:    new Date(),
      errorMessage:   errors.length > 0 ? `Fallos en: ${errors.slice(0, 10).join(', ')}` : null,
    })
    .where(eq(newsletterSends.postId, postId));

  return NextResponse.json({ ok: true, sent, failed: errors.length });
}
