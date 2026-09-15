import { sql } from 'drizzle-orm';
import { posts } from '@/db/schema/posts';

/** Same reserved markers as isPressOutreach, applied before SQL pagination/joins. */
export const pressOutreachCondition = sql<boolean>`(
  ${posts.tags} @> '["press-outreach"]'::jsonb
  or ${posts.slug} like 'prensa-%'
  or ${posts.tags} @> '["prensa", "adaptacion-editorial"]'::jsonb
)`;

export const webEditorialCondition = sql<boolean>`not ${pressOutreachCondition}`;
