import { initTRPC, TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import superjson from 'superjson';
import { auth } from '@/lib/auth';
import type { Role } from '@/lib/auth-guard';

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
  if (process.env.NODE_ENV === 'development') {
    const devRole = (process.env.DEV_ROLE_OVERRIDE as Role | undefined) ?? 'admin';
    return {
      session: { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: devRole },
    };
  }

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return { session: null };

  return {
    session: {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: ((session.user as { role?: string | null }).role as Role | null) ?? null,
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
 * Procedure that requires an authenticated session with any valid role.
 * Throws UNAUTHORIZED if no session is present.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { session: ctx.session } });
});

/**
 * Procedure that requires `brand` role.
 * In development, mirrors auth-guard behaviour: always passes with role `brand`
 * unless DEV_ROLE_OVERRIDE is set to something else (in which case it still
 * passes — brand routes should be testable without extra env config).
 */
export const brandProcedure = t.procedure.use(({ ctx, next }) => {
  if (process.env.NODE_ENV === 'development') {
    const session = ctx.session ?? { userId: 'dev', email: 'dev@localhost', name: 'Dev', role: 'brand' as const };
    return next({ ctx: { session: { ...session, role: 'brand' as const } } });
  }
  if (!ctx.session || ctx.session.role !== 'brand') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx: { session: ctx.session } });
});

type AdminRole = 'admin' | 'manager' | 'staff';
const ADMIN_ROLES: readonly AdminRole[] = ['admin', 'manager', 'staff'];

/**
 * Procedure that requires `admin`, `manager`, or `staff` role.
 * Propagates a narrowed context where `session.role` is typed as `AdminRole`.
 */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.role;
  if (!ctx.session || !role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      session: {
        userId: ctx.session.userId,
        email: ctx.session.email,
        name: ctx.session.name,
        role: role as AdminRole,
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
