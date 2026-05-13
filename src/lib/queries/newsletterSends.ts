import { db } from '@/lib/db';
import { newsletterSends } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { NewsletterSend } from '@/db/schema/newsletterSends';

export type { NewsletterSend };

export async function getNewsletterSendByPostId(postId: number): Promise<NewsletterSend | undefined> {
  const [row] = await db
    .select()
    .from(newsletterSends)
    .where(eq(newsletterSends.postId, postId))
    .limit(1);
  return row;
}
