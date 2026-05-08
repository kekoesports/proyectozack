# Blog covers

Sube aquí los covers reales de los posts. Convención de nombres:

```
[post-slug].jpg          # Cover principal usado en card + featured
[post-slug]@hero.jpg     # (opcional) Versión hero 16:9 para el post individual
```

Aspect ratios:
- Card grid: 3:2 (mínimo 1200×800)
- Featured / Hero: 16:9 (mínimo 1600×900)
- OG dinámica: la genera `/api/og-image/blog` automáticamente

Después de subir el archivo, actualiza la BD:

```sql
UPDATE posts SET cover_url = '/images/blog/covers/[post-slug].jpg' WHERE slug = '[post-slug]';
```

Para producción, **se recomienda Vercel Blob** en vez de `public/` — mejor caching, versionado y no infla el bundle.

Sistema completo documentado en [`docs/blog-cover-system.md`](../../../../docs/blog-cover-system.md).
