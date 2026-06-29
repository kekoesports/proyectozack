import type { NextConfig } from "next";
import path from "node:path";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https://*.vercel-storage.com https://www.googletagmanager.com https://*.twitch.tv https://*.jtvnw.net https://img.youtube.com https://*.ytimg.com https://i.imgur.com https:",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://va.vercel-scripts.com https://vitals.vercel-insights.com wss://*.twitch.tv https://*.twitch.tv",
      "frame-src https://player.twitch.tv https://clips.twitch.tv https://www.youtube.com https://youtube.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfjs-dist uses DOMMatrix at module init — exclude from Turbopack SSR bundle
  // so Node.js loads it natively at runtime instead of bundling it.
  serverExternalPackages: ['pdfjs-dist'],
  async redirects() {
    return [
      // /gaming/cs2 → /influencers-cs2 (301 permanent)
      // Both pages are in Spanish. /influencers-cs2 has better schema, hreflang and structure.
      // Created 2026-05-03 — no external backlinks, safe to redirect.
      {
        source: '/gaming/cs2',
        destination: '/influencers-cs2',
        permanent: true,
      },
      // /gaming/betting → /servicios/igaming (301 permanent — direct, no chain)
      // Originally pointed to /influencers-betting, which itself now redirects to /servicios/igaming.
      // Shortcutting to the final destination avoids a 301→301 chain and passes authority directly.
      {
        source: '/gaming/betting',
        destination: '/servicios/igaming',
        permanent: true,
      },
      // /influencers-betting → /servicios/igaming (301 permanent)
      // Opción A: consolidate ES betting/iGaming authority in /servicios/igaming (the hub page).
      // /influencers-betting was cannibalising /servicios/igaming for Spanish-language searches.
      // /betting-influencers (EN) is kept as an independent EN landing.
      {
        source: '/influencers-betting',
        destination: '/servicios/igaming',
        permanent: true,
      },
      // /talento/naow-ivan-gonzalez → /talentos/naow (301 permanent — specific before generic)
      // Old WordPress slug used full name; current slug is short handle.
      { source: '/talento/naow-ivan-gonzalez',  destination: '/talentos/naow', permanent: true },
      { source: '/talento/naow-ivan-gonzalez/', destination: '/talentos/naow', permanent: true },
      // /talento/:slug → /talentos/:slug (301 permanent)
      // Old URL structure used singular /talento/; current is /talentos/.
      { source: '/talento/:slug/',              destination: '/talentos/:slug', permanent: true },
      { source: '/talento/:slug',               destination: '/talentos/:slug', permanent: true },
      // /en/talents → /talents (308 permanent)
      // Old EN talent listing URL; current canonical is /talents.
      { source: '/en/talents/',                 destination: '/talents', permanent: true },
      { source: '/en/talents',                  destination: '/talents', permanent: true },
      // /en/services → /services (308 permanent)
      // /en/contact → /contact (308 permanent)
      // Regulariza rutas /en/* sin página propia para que coincidan con /en/talents.
      { source: '/en/services/',                destination: '/services', permanent: true },
      { source: '/en/services',                 destination: '/services', permanent: true },
      { source: '/en/contact/',                 destination: '/contact',  permanent: true },
      { source: '/en/contact',                  destination: '/contact',  permanent: true },
      // /marcas/login → /admin/login (308 permanent)
      // /marcas/login page was removed in the CRM refactor; brand users log in via /admin/login
      // and are redirected to /marcas after successful auth. Keeps bookmarks and backlinks working.
      {
        source: '/marcas/login',
        destination: '/admin/login',
        permanent: true,
      },
      // /giveaways → /codigos (301 permanent — ruta renombrada 2026-06-04)
      // Preserva SEO authority y backlinks externos que apunten a /giveaways.
      {
        source: '/giveaways',
        destination: '/codigos',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Vercel Blob Storage
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      // Twitch CDN — profile pictures from Twitch API and hardcoded avatars
      { protocol: 'https', hostname: '*.jtvnw.net' },
      { protocol: 'https', hostname: '*.twitch.tv' },
      // Kick CDN — profile pictures (WorkedWithSection)
      { protocol: 'https', hostname: 'files.kick.com' },
      // YouTube — thumbnails stored in DB or referenced from posts
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '*.ytimg.com' },
      // Imgur — brand logos entered via admin panel
      { protocol: 'https', hostname: 'i.imgur.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['motion', 'recharts'],
    serverActions: {
      // Default is 1MB — photos can be up to 5MB (PHOTO_TYPES.maxBytes)
      // Without this, Next.js returns 400 before the action even runs
      bodySizeLimit: '6mb',
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
