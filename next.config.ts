import type { NextConfig } from "next";

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
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://*.vercel-storage.com https://www.googletagmanager.com https://*.twitch.tv https://*.jtvnw.net https://img.youtube.com https://*.ytimg.com https:",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com wss://*.twitch.tv https://*.twitch.tv",
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
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    optimizePackageImports: ['motion', 'recharts'],
  },
};

export default nextConfig;
