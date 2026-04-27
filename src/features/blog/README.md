# Feature · blog

> Blog corporativo con MDX/Markdown.

## Routes que sirve

- `/blog` — listado
- `/blog/[slug]` — post detail
- `/blog/feed.xml` — RSS

## Entry points

- `components/BlogCard.tsx` — card de post.
- `components/TalentMiniCard.tsx` — card mini para enlazar talents desde posts.

## Server vs Client

- **Server**: ambos.

## Dependencias clave

- `@/lib/queries/posts`.
- `@/types/content`.
