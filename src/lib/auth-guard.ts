import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { env } from '@/lib/env';

export type Role =
  | 'admin'
  | 'manager'
  | 'staff'
  | 'brand'
  | 'editor'
  | 'finance'
  | 'analyst'
  | 'ops'
  | 'talent_manager';

export const ROLES = [
  'admin', 'manager', 'staff', 'brand',
  'editor', 'finance', 'analyst', 'ops', 'talent_manager',
] as const satisfies readonly Role[];

// NODE_ENV and ENABLE_DEV_AUTH_BYPASS are exempt from lib/env — they control
// the environment itself and must be readable before env validation runs.
//
// Bypass requires BOTH conditions simultaneously:
//   1. NODE_ENV === 'development'   (Vercel always sets 'production' in prod/preview)
//   2. ENABLE_DEV_AUTH_BYPASS=true  (explicit opt-in, never present in Vercel envs)
//
// Fail-closed: if ENABLE_DEV_AUTH_BYPASS=true outside development, we panic at
// module load time — this surfaces immediately in build logs and Vercel startup.
if (
  process.env.ENABLE_DEV_AUTH_BYPASS === 'true' &&
  process.env.NODE_ENV !== 'development'
) {
  throw new Error(
    '[auth-guard] ENABLE_DEV_AUTH_BYPASS=true detected outside NODE_ENV=development. ' +
    'This is a critical misconfiguration — remove this env var from Vercel immediately.',
  );
}

export const IS_DEV =
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_DEV_AUTH_BYPASS === 'true';

if (IS_DEV) {
  // Visible in local server logs — confirms bypass is active intentionally.
  console.warn('[auth-guard] ⚠️  DEV AUTH BYPASS ACTIVE — never enable in production');
}

export const DEV_USER = {
  id: 'dev',
  email: 'dev@localhost',
  name: 'Dev',
} as const;

export function isRole(x: unknown): x is Role {
  // safe: typeof guard above narrows x to string; ROLES widened so .includes() accepts string
  return typeof x === 'string' && (ROLES as readonly string[]).includes(x);
}

export function rolesIncludes<R extends Role>(roles: readonly R[], x: Role): x is R {
  // safe: roles widened to Role[] so .includes() accepts the wider Role-typed x; type guard returns true only when x is a member, narrowing to R
  return (roles as readonly Role[]).includes(x);
}

const ALLOWED_LOGIN_PATHS = new Set([
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

type SessionWithRole = {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role | null;
  };
};

type SessionWithNarrowedRole<R extends Role> = {
  user: {
    id: string;
    email: string;
    name: string;
    role: R;
  };
};

function homeForRole(role: Role | null | undefined): string | null {
  if (role === 'admin')          return '/admin';
  if (role === 'manager')        return '/admin';
  if (role === 'staff')          return '/admin/mi-semana';
  if (role === 'brand')          return '/marcas';
  if (role === 'editor')         return '/admin/noticias';
  if (role === 'finance')        return '/admin/facturas';
  if (role === 'analyst')        return '/admin/analytics';
  if (role === 'ops')            return '/admin/agenda';
  if (role === 'talent_manager') return '/admin/talentos';
  return null;
}

async function loadSession(loginPath: string): Promise<SessionWithRole> {
  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/admin/login';

  if (IS_DEV) {
    return { user: { ...DEV_USER, role: 'admin' } };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(safePath);

  const rawRole = (session.user as { role?: string | null }).role;
  const userRole: Role | null = isRole(rawRole) ? rawRole : null;

  return {
    user: {
      id:    session.user.id,
      email: session.user.email,
      name:  session.user.name,
      role:  userRole,
    },
  };
}

export async function requireRole<R extends Role>(role: R, loginPath: string): Promise<SessionWithNarrowedRole<R>> {
  if (IS_DEV) {
    return { user: { ...DEV_USER, role } };
  }

  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/admin/login';
  const session  = await loadSession(loginPath);
  const userRole = session.user.role;

  if (userRole !== role) {
    const home = homeForRole(userRole);
    if (home) redirect(home);
    redirect(safePath);
  }

  return { user: { ...session.user, role } };
}

export async function requireAnyRole<R extends Role>(
  roles: readonly R[],
  loginPath: string,
): Promise<SessionWithNarrowedRole<R>> {
  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/';

  if (IS_DEV) {
    const fallback = roles[0];
    if (!fallback) throw new Error('requireAnyRole: roles must be non-empty');
    const override = env.DEV_ROLE_OVERRIDE;
    const mockRole: R = override && rolesIncludes(roles, override) ? override : fallback;
    return { user: { ...DEV_USER, role: mockRole } };
  }

  const session  = await loadSession(safePath);
  const userRole = session.user.role;

  if (!userRole || !rolesIncludes(roles, userRole)) {
    const home = homeForRole(userRole);
    if (home) redirect(home);
    redirect(safePath);
  }

  return { user: { ...session.user, role: userRole } };
}
