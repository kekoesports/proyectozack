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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Crawlers genéricos ───────────────────────────────────────────
      {
        userAgent: '*',
        // Specificity: paths más largos ganan sobre /marcas/ en robots.txt
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [
          // Endpoints técnicos y autenticación
          '/api/',
          '/admin/',
          '/auth/',
          // Portal privado de marcas (las páginas SEO públicas están en allow arriba)
          '/marcas/',
          // Assets internos de Next.js (no indexables)
          '/_next/',
          // Parámetros de URL (evita duplicados de contenido)
          '/*?*',
          '/*&*',
        ],
      },

      // ─── Bots de IA — permitir para visibilidad en AI Overviews ──────
      {
        userAgent: 'GPTBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', ...PUBLIC_BRAND_PAGES],
        disallow: [...PRIVATE_PATHS],
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
      },

      // ─── Bing y Microsoft ─────────────────────────────────────────────
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
      },
      {
        userAgent: 'MSNBot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
      },

      // ─── Scrapers agresivos — bloquear completamente ──────────────────
      {
        userAgent: 'CCBot',
        disallow: '/',
      },
      {
        userAgent: 'Bytespider',
        disallow: '/',
      },
    ],


    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
