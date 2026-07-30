import { NextResponse, type NextRequest } from 'next/server';
import { requireAnyRole } from '@/lib/auth-guard';
import { fetchTwitchUserPhotoByLogin } from '@/lib/services/twitch';

/**
 * TEMPORAL — utilidad para completar PR #254 (fotos Twitch).
 *
 * Devuelve `{ login, userId, profileImageUrl }` para una lista de logins
 * pasada via query (`?logins=a,b,c`, máx 20). Usa las credenciales Twitch
 * de producción a través de `fetchTwitchUserPhotoByLogin`.
 *
 * NO revela secretos: solo el `profile_image_url`, que es una URL de CDN
 * estático público de Twitch (`static-cdn.jtvnw.net/…`), no un asset con
 * auth. Los `access_token` y `TWITCH_CLIENT_*` nunca se serializan.
 *
 * Auth: sesión con rol `admin` o `manager` (better-auth). Cualquier otro
 * rol o request no autenticada es redirigido por `requireAnyRole`.
 *
 * ELIMINAR antes del merge de la PR.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const raw = req.nextUrl.searchParams.get('logins') ?? '';
  const logins = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9_]{1,25}$/.test(s));

  if (logins.length === 0) {
    return NextResponse.json({ ok: false, error: 'missing_or_invalid_logins' }, { status: 400 });
  }
  if (logins.length > 20) {
    return NextResponse.json({ ok: false, error: 'too_many_logins' }, { status: 400 });
  }

  try {
    const results = await fetchTwitchUserPhotoByLogin(logins);
    return NextResponse.json({
      ok: true,
      requested: logins,
      results: results.map((r) => ({
        login: r.login,
        userId: r.userId,
        profileImageUrl: r.profileImageUrl,
      })),
    });
  } catch {
    // Nunca serializamos el mensaje de error de Twitch — podría contener el
    // access_token en algunos códigos de error 401/403.
    return NextResponse.json({ ok: false, error: 'twitch_api_error' }, { status: 502 });
  }
}
