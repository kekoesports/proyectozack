import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export type Role = 'admin' | 'brand' | 'staff' | 'manager';

const ALLOWED_LOGIN_PATHS = new Set(['/admin/login']);

type SessionWithRole = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string | null;
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

function homeForRole(role: string | null | undefined): string | null {
  if (role === 'admin') return '/admin';
  if (role === 'manager') return '/admin';
  if (role === 'brand') return '/marcas';
  if (role === 'staff') return '/admin/mi-semana';
  return null;
}

async function loadSession(loginPath: string): Promise<SessionWithRole> {
  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/admin/login';

  if (process.env.NODE_ENV === 'development') {
    return { user: { id: 'dev', email: 'dev@localhost', name: 'Dev', role: 'admin' } };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(safePath);

  const userRole = (session.user as { role?: string | null }).role ?? null;

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
  if (process.env.NODE_ENV === 'development') {
    return { user: { id: 'dev', email: 'dev@localhost', name: 'Dev', role } };
  }

  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/admin/login';
  const session  = await loadSession(loginPath);
  const userRole = session.user.role;

  if (userRole !== role) {
    const home = homeForRole(userRole);
    if (home) redirect(home);
    redirect(safePath);
  }

  return { user: { ...session.user, role: userRole as R } };
}

export async function requireAnyRole<R extends Role>(
  roles: readonly R[],
  loginPath: string,
): Promise<SessionWithNarrowedRole<R>> {
  const safePath = ALLOWED_LOGIN_PATHS.has(loginPath) ? loginPath : '/';

  if (process.env.NODE_ENV === 'development') {
    const override = process.env.DEV_ROLE_OVERRIDE as R | undefined;
    const mockRole = (override && (roles as readonly string[]).includes(override) ? override : roles[0]) ?? ('admin' as R);
    return { user: { id: 'dev', email: 'dev@localhost', name: 'Dev', role: mockRole } };
  }

  const session  = await loadSession(safePath);
  const userRole = session.user.role;

  if (!userRole || !(roles as readonly string[]).includes(userRole as R)) {
    const home = homeForRole(userRole);
    if (home) redirect(home);
    redirect(safePath);
  }

  return { user: { ...session.user, role: userRole as R } };
}
