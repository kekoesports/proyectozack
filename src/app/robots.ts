import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site-url';

// Páginas SEO públicas bajo /marcas/ — permitidas explícitamente.
// El portal privado /marcas/(portal)/ queda bloqueado por el disallow genérico de /marcas/.
const PUBLIC_BRAND_PAGES = [
  '/marcas/keydrop',
  '/marcas/hellcase',
  '/marcas/skinplace',
  '/marcas/skinsmonkey',
] as const;

const PRIVATE_PATHS = ['/api/', '/admin/', '/auth/', '/marcas/'] as const;

// Declara usos permitidos del contenido sin alterar las reglas de rastreo.
// Se repite en cada grupo porque los crawlers eligen el User-Agent más específico
// y no heredan necesariamente las directivas del grupo comodín.
const CONTENT_SIGNALS = {
  'Content-Signal': 'search=yes, ai-input=yes, ai-train=no',
} as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Crawlers genéricos ───────────────────────────────────────────
      {
        userAgent: '*',
        // Specificity: paths más largos ganan en robots.txt (Google usa longest-match).
        // /news?tag= y /blog?tag= son páginas de etiquetas con contenido propio → indexar.
        // /*?* bloquea el resto de query params (búsquedas, paginación) para evitar duplicados.
        allow: [
          '/',
          // Vercel añade `?dpl=...` a JS, CSS y fuentes de Next. Sin este
          // allow, la regla `/*?*` impide que Googlebot renderice la página y
          // Search Console los contabiliza como cientos de URLs bloqueadas.
          '/_next/static/',
          '/news?tag=',
          '/blog?tag=',
          ...PUBLIC_BRAND_PAGES,
        ],
        disallow: [
          // Endpoints técnicos y autenticación
          '/api/',
          '/admin/',
          '/auth/',
          // Portal privado de marcas (las páginas SEO públicas están en allow arriba)
          '/marcas/',
          // Rutas WordPress — no existen, evita que bots las rastreen
          '/wp-content/',
          '/wp-admin/',
          '/wp-login.php',
          // Parámetros de URL (evita duplicados de contenido: búsquedas, sort, etc.)
          '/*?*',
          '/*&*',
        ],
        other: CONTENT_SIGNALS,
      },

      // ─── Bots de IA — permitir para visibilidad en AI Overviews ──────
      {
        userAgent: 'GPTBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
        other: CONTENT_SIGNALS,
      },

      // ─── Bing y Microsoft ─────────────────────────────────────────────
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'MSNBot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
        other: CONTENT_SIGNALS,
      },

      // ─── Scrapers agresivos — bloquear completamente ──────────────────
      {
        userAgent: 'CCBot',
        disallow: '/',
        other: CONTENT_SIGNALS,
      },
      {
        userAgent: 'Bytespider',
        disallow: '/',
        other: CONTENT_SIGNALS,
      },
    ],


    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
