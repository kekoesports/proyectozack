import { initTRPC, TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import superjson from 'superjson';
import { auth } from '@/lib/auth';
import { isRole, rolesIncludes, IS_DEV, DEV_USER, type Role } from '@/lib/auth-guard';
import { env } from '@/lib/env';

export type TRPCContext = {
  session: {
    userId: string;
    email: string;
    name: string;
    role: Role | null;
  } | null;
};

/**
 * Inner context — runs once per request, cached via React `cache()`.
 * Reads the Better Auth session from the incoming request headers.
 */
const createInnerContext = cache(async (): Promise<TRPCContext> => {
  if (IS_DEV) {
    const devRole: Role = env.DEV_ROLE_OVERRIDE ?? 'admin';
    return {
      session: { userId: DEV_USER.id, email: DEV_USER.email, name: DEV_USER.name, role: devRole },
    };
  }

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { session: null };

  const rawRole = (session.user as { role?: string | null }).role;
  return {
    session: {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: isRole(rawRole) ? rawRole : null,
    },
  };
});

export async function createTRPCContext(): Promise<TRPCContext> {
  return createInnerContext();
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;

/** Public procedure with no auth — open to anonymous callers. */
export const publicProcedure = t.procedure;

/**
 * Procedure that requires `brand` role.
 * In development, mirrors auth-guard behaviour: always passes with role `brand`
 * unless DEV_ROLE_OVERRIDE is set to something else (in which case it still
 * passes — brand routes should be testable without extra env config).
 */
export const brandProcedure = t.procedure.use(({ ctx, next }) => {
  if (IS_DEV) {
    const session = ctx.session ?? {
      userId: DEV_USER.id,
      email: DEV_USER.email,
      name: DEV_USER.name,
      role: 'brand' as const,
    };
    return next({ ctx: { session: { ...session, role: 'brand' as const } } });
  }
  if (!ctx.session || ctx.session.role !== 'brand') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { session: ctx.session } });
});

type AdminRole = 'admin' | 'admin_limited_tasks' | 'manager' | 'staff';
const ADMIN_ROLES = ['admin', 'admin_limited_tasks', 'manager', 'staff'] as const satisfies readonly AdminRole[];

/**
 * Procedure that requires `admin`, `manager`, or `staff` role.
 * Propagates a narrowed context where `session.role` is typed as `AdminRole`.
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.role;
  if (!ctx.session || !role || !rolesIncludes(ADMIN_ROLES, role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      session: {
        userId: ctx.session.userId,
        email: ctx.session.email,
        name: ctx.session.name,
        role,
      },
    },
  });
});

/**
 * Procedure that requires `admin` role only.
 */
export const strictAdminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || ctx.session.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { session: ctx.session } });
});
