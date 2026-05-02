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
      "img-src 'self' data: https://*.vercel-storage.com https://www.googletagmanager.com https:",
      "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'none'",
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
      // /gaming/betting → /influencers-betting (301 permanent)
      // Same rationale. Eliminates cannibalisation with /influencers-betting and /servicios/igaming.
      {
        source: '/gaming/betting',
        destination: '/influencers-betting',
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
