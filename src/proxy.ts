import { NextRequest, NextResponse } from 'next/server';
import { getLocaleDecision, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/lib/locale-detection';

/* -------------------------------------------------------------------------- */
/*  In-memory sliding-window rate limiter (per-IP, per-route bucket)          */
/*  Resets on deploy / cold start — acceptable for Vercel serverless.         */
/* -------------------------------------------------------------------------- */

type Bucket = {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Evict stale entries every 60s to bound memory
const EVICT_INTERVAL = 60_000;
let lastEvict = Date.now();

function evictStale(now: number) {
  if (now - lastEvict < EVICT_INTERVAL) return;
  lastEvict = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  evictStale(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/* ---------- Route-specific limits ----------------------------------------- */
// Auth endpoints: 10 requests / 15 min per IP (brute-force protection)
// Public form endpoints: 5 requests / min per IP (spam protection)

const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\/sign-in/, limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/auth\/sign-up/, limit: 5,  windowMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/auth\/forget-password/, limit: 5, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/contact$/,      limit: 5,  windowMs: 60 * 1000 },
  { pattern: /^\/api\/creator-apply$/,limit: 3,  windowMs: 60 * 1000 },
];

function getClientIp(req: NextRequest): string {
  // Prefer Vercel's trusted header (cannot be spoofed by clients)
  return (
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

/* ---------- Admin session guard -------------------------------------------- */
// Cookie-presence check only — full role validation happens inside page components.
// Covers both HTTP (better-auth.session_token) and HTTPS (__Secure-better-auth.session_token).

const IS_DEV = process.env.NODE_ENV === 'development';

const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/admin/two-factor',
  '/admin/forgot-password',
  '/admin/reset-password',
]);

function checkAdminSession(req: NextRequest): NextResponse | null {
  if (IS_DEV) return null;

  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return null;
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return null;

  const hasSession = req.cookies
    .getAll()
    .some((c) => c.name.includes('better-auth.session_token'));

  if (!hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return null;
}

/* ---------- Locale cookie writer -------------------------------------------- */

const LOCALE_COOKIE_OPTS = { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: 'lax' as const };

// Bot UA detector — hoy no cambia el flujo (nadie redirige por locale) pero
// se conserva para consumidores que puedan necesitarlo.
const BOT_UA_REGEX =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|applebot|facebookexternalhit|twitterbot|linkedinbot|gptbot|oai-searchbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot|amazonbot|google-extended/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA_REGEX.test(ua);
}

/**
 * Escribe la cookie de preferencia de idioma cuando corresponda. NUNCA
 * redirige. Ver `src/lib/locale-detection.ts` para el porqué.
 */
function applyLocaleCookie(req: NextRequest, res: NextResponse): NextResponse {
  const { pathname } = req.nextUrl;
  if (pathname !== '/' && pathname !== '/en') return res;

  const decision = getLocaleDecision({
    pathname,
    cookieLocale: req.cookies.get(LOCALE_COOKIE)?.value,
    country: req.headers.get('x-vercel-ip-country'),
    acceptLanguage: req.headers.get('accept-language'),
  });

  if (decision.writeCookie) {
    res.cookies.set(LOCALE_COOKIE, decision.locale, LOCALE_COOKIE_OPTS);
  }
  return res;
}

/* ---------- Cutover maintenance gate --------------------------------------- */

const MAINTENANCE_HEALTH_PATHS = new Set([
  '/api/health/live',
  '/api/health/ready',
]);

function maintenanceResponse(req: NextRequest): NextResponse | null {
  if (process.env.MAINTENANCE_MODE !== 'true') return null;
  if (MAINTENANCE_HEALTH_PATHS.has(req.nextUrl.pathname)) return null;

  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'Retry-After': '300',
    'X-Robots-Tag': 'noindex, nofollow',
  };

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { ok: false, error: 'maintenance', message: 'Servicio temporalmente en mantenimiento.' },
      { status: 503, headers },
    );
  }

  return new NextResponse(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>SocialPro · Mantenimiento</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #101421; color: #f7f8fb; }
      main { width: min(560px, calc(100% - 48px)); padding: 42px; border: 1px solid #30364a; border-radius: 24px; background: #171c2d; box-shadow: 0 24px 80px #0005; }
      span { color: #ff6338; font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      h1 { margin: 14px 0 12px; font-size: clamp(30px, 6vw, 48px); line-height: 1.05; }
      p { margin: 0; color: #adb4c9; font-size: 17px; line-height: 1.65; }
    </style>
  </head>
  <body>
    <main>
      <span>SocialPro</span>
      <h1>Volvemos enseguida</h1>
      <p>Estamos realizando una actualización programada para mejorar el servicio. No necesitas hacer nada.</p>
    </main>
  </body>
</html>`, {
    status: 503,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/* ---------- Main proxy ------------------------------------------------------ */

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const maintenance = maintenanceResponse(req);
  if (maintenance) return maintenance;

  // Inyecta `x-pathname` en la request para que el root layout pueda leer la
  // ruta y decidir `<html lang>`. Sin esto, `layout.tsx` no tiene acceso al
  // pathname en RSC. Ver src/app/layout.tsx.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  const passWithHeaders = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Admin session guard.
  const adminRedirect = checkAdminSession(req);
  if (adminRedirect) return adminRedirect;

  // Rate limits sobre rutas API sensibles.
  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      const ip = getClientIp(req);
      const key = `${ip}:${rule.pattern.source}`;

      if (isRateLimited(key, rule.limit, rule.windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 },
        );
      }
      break;
    }
  }

  return applyLocaleCookie(req, passWithHeaders());
}

// Matcher amplio: cubre TODAS las rutas HTML públicas + api + admin. Excluye
// assets estáticos y archivos con extensión. Necesario para que `x-pathname`
// llegue al root layout en cualquier ruta y `<html lang>` sea correcto.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|txt|xml|json|mp4|webm|woff2?)$).*)',
  ],
};
