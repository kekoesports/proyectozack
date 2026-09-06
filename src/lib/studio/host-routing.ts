import { StudioAppHost } from '@/lib/schemas/studio-host';

const AUTH_ALIASES: Readonly<Record<string, string>> = {
  '/login': '/studio/login',
  '/admin/login': '/studio/login',
  '/admin/two-factor': '/studio/two-factor',
  '/admin/forgot-password': '/studio/forgot-password',
  '/admin/reset-password': '/studio/reset-password',
};
const ALLOWED_PREFIXES = ['/studio', '/api/studio', '/api/auth', '/_next', '/images', '/fonts'];
const ALLOWED_FILES = new Set(['/favicon.ico', '/robots.txt', '/api/health/live', '/api/health/ready']);

/** Product routing only, never authorization. Every server data/action guard still runs. */
export function studioHostRoute(host: unknown, pathname: string, method: string) {
  if (!StudioAppHost.safeParse(host).success) return { kind: 'pass' } as const;
  if (ALLOWED_FILES.has(pathname) || ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return { kind: 'pass' } as const;
  }
  // Never replay a CRM mutation or its body across applications/domains.
  if (method !== 'GET' && method !== 'HEAD' || pathname.startsWith('/api/')) return { kind: 'reject' } as const;
  const alias = AUTH_ALIASES[pathname];
  return { kind: 'redirect', path: alias ?? '/studio', preserveSearch: Boolean(alias) } as const;
}
