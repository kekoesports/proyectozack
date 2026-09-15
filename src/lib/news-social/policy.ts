import type { InferSelectModel } from 'drizzle-orm';
import type { posts } from '@/db/schema/posts';
import { isPressOutreach } from '@/lib/content-channel';

export const NEWS_SOCIAL_ORIGIN = 'https://socialpro.es';
export const X_LINK_COST_CENTS = 20;
// Conservative reservation per create attempt, including failed/uncertain requests.
export const X_MONTHLY_BUDGET_CENTS = 400;
export const NEWS_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export type SocialNewsPost = Pick<InferSelectModel<typeof posts>, 'id' | 'slug' | 'title' | 'excerpt' | 'tags' | 'status' | 'vertical' | 'publishedAt'>;

export function isPublicNews(post: SocialNewsPost, now: Date): boolean {
  return post.vertical === 'news' && post.status === 'published' && !!post.publishedAt
    && post.publishedAt <= now && !isPressOutreach(post);
}

export function isEligibleNews(post: SocialNewsPost, startAt: Date, now: Date): boolean {
  return isPublicNews(post, now) && !!post.publishedAt && post.publishedAt >= startAt
    && now.getTime() - post.publishedAt.getTime() <= NEWS_MAX_AGE_MS;
}

export function cleanSocialText(value: string): string {
  return value.replace(/https?:\/\/\S+/gi, '').replace(/<[^>]*>/g, '')
    .replace(/[@#]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function shorten(value: string, max: number): string {
  const chars = Array.from(cleanSocialText(value));
  return chars.length <= max ? chars.join('') : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export function composeNewsPost(post: SocialNewsPost) {
  const articleUrl = new URL(`/news/${encodeURIComponent(post.slug)}`, NEWS_SOCIAL_ORIGIN);
  articleUrl.searchParams.set('utm_source', 'x');
  articleUrl.searchParams.set('utm_medium', 'social');
  articleUrl.searchParams.set('utm_campaign', 'noticias');
  // At most 100 Unicode codepoints: even double-weight characters fit in 280 with the URL.
  const title = shorten(post.title, 100);
  const text = `${title}\n\nLee la noticia: ${articleUrl.href}\n\n#CS2 #Esports`;
  return { text, articleUrl: new URL(`/news/${encodeURIComponent(post.slug)}`, NEWS_SOCIAL_ORIGIN).href };
}

export function budgetMonth(now: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).format(now);
}
