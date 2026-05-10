import { pgTable, pgEnum, serial, varchar, text, timestamp, integer, index, jsonb } from 'drizzle-orm/pg-core';

export const postStatusEnum = pgEnum('post_status', ['draft', 'published']);
export const postVerticalEnum = pgEnum('post_vertical', ['blog', 'news']);

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  title: varchar('title', { length: 300 }).notNull(),
  excerpt: text('excerpt').notNull(),
  bodyMd: text('body_md').notNull(),
  coverUrl: varchar('cover_url', { length: 500 }),
  author: varchar('author', { length: 100 }).notNull().default('SocialPro'),
  status: postStatusEnum('status').notNull().default('draft'),
  vertical: postVerticalEnum('vertical').notNull().default('blog'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  talentSlugs: jsonb('talent_slugs').$type<string[]>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('posts_slug_idx').on(t.slug),
  index('posts_status_idx').on(t.status),
  index('posts_status_published_at_idx').on(t.status, t.publishedAt),
  index('posts_vertical_status_pub_idx').on(t.vertical, t.status, t.publishedAt),
]);
