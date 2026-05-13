import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const { GET } = toNextJsHandler(auth);

const { POST: authPost } = toNextJsHandler(auth);

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Rate limit solo en sign-in — no en refresh, logout, etc.
  if (url.pathname.includes('/sign-in')) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '127.0.0.1';

    const rl = checkRateLimit({ key: `login:${ip}`, limit: 5, windowMs: 15 * 60_000 });
    if (!rl.ok) {
      return Response.json(
        { error: 'Demasiados intentos. Prueba de nuevo en 15 minutos.' },
        { status: 429 },
      );
    }
  }

  return authPost(req);
}
