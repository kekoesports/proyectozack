import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ─── Crawlers genéricos ───────────────────────────────────────────
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Endpoints técnicos y autenticación
          '/api/',
          '/admin/',
          '/auth/',
          // Portales privados
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
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/marcas/'],
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
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/marcas/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/marcas/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/marcas/'],
      },
      {
        userAgent: 'Amazonbot',
        allow: '/',
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
