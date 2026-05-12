import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Bypass auth entirely in development — auth-guard.ts handles it at page level.
const IS_DEV = process.env.NODE_ENV === 'development';

// Admin paths that must remain public (login flows).
const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

export function middleware(request: NextRequest) {
  if (IS_DEV) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  // Cookie-presence check only. Full role validation happens inside page components
  // via requireRole/requireAnyRole/requirePermission. We only verify a session
  // exists at the Edge to prevent unauthenticated responses being served at all.
  //
  // Pattern covers both HTTP (better-auth.session_token) and
  // HTTPS (__Secure-better-auth.session_token).
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.includes('better-auth.session_token'));

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
