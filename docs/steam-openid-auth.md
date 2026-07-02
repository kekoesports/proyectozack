# Steam OpenID — autenticación de jugadores

## Resumen

Plataforma de sorteos usa Steam OpenID 2.0 para autenticar jugadores. Implementado como plugin de Better Auth (`src/lib/steam/plugin.ts`) que registra dos endpoints bajo el catch-all `/api/auth/*`:

- `GET /api/auth/steam/login` — genera un state anti-CSRF, lo firma en una cookie httpOnly (10 min TTL) y redirige a `steamcommunity.com/openid/login`.
- `GET /api/auth/steam/callback` — Steam devuelve al usuario con los params `openid.*`. El plugin:
  1. Valida el state contra la cookie firmada.
  2. POST a `steamcommunity.com/openid/login` con `openid.mode=check_authentication` para verificar la firma.
  3. Extrae el SteamID64 del `openid.claimed_id` con regex estricta (17 dígitos).
  4. Fetch al perfil público vía Steam Web API (si `STEAM_API_KEY` está definida) para obtener `personaname` y `avatarfull`.
  5. Upsert `user` + `account` (`providerId='steam'`, `accountId=<steamid64>`) + `player_profiles` (crea la fila la primera vez, no pisa `steamTradeUrl`/`isPrivate`/`shippingAddress` en logins posteriores).
  6. `internalAdapter.createSession(userId)` + `setSessionCookie(ctx, {session, user})`.
  7. Redirect a `/sorteos/plataforma`.

## Env vars

- **`STEAM_API_KEY`** (opcional). Server-only, no llega al cliente. Sin ella el login OpenID sigue funcionando y el usuario se crea con `name="Jugador de Steam"` y `avatar=null`. Con ella, se enriquece con nombre y avatar reales de Steam.

  Obtener key: https://steamcommunity.com/dev/apikey  
  Definir en `.env.local` (dev) y en Vercel Environment (prod/preview).

## Seguridad

- **State anti-CSRF**: token aleatorio de 32 bytes en cookie firmada con `BETTER_AUTH_SECRET`, `httpOnly`, `sameSite=lax`, `secure` en HTTPS, TTL 10 min. Validado en callback antes de cualquier verificación con Steam.
- **Fail-closed en verificación**: si `check_authentication` no devuelve `is_valid:true` exacto, o si el fetch falla / hace timeout (10s), se rechaza.
- **Regex estricta SteamID**: `/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/` — solo HTTPS, dominio exacto, 17 dígitos.
- **`role=null`**: los usuarios Steam nunca reciben role admin/staff. `requireRole`/`requireAnyRole` de `auth-guard.ts` filtra correctamente (el role queda `null`).
- **Email placeholder**: `steam_<sid>@steam.socialpro.internal` con `emailVerified=false` para evitar cualquier envío accidental. Nunca es una dirección real.
- **Sin logs de la API key**: `profile.ts` compone la URL internamente y no la escribe en errores capturados (fetch se envuelve en try/catch que devuelve `FALLBACK_PROFILE` sin exponer detalles).

## Idempotencia

- **Repetir login del mismo SteamID64**:
  - `findOAuthUser(email, sid, 'steam')` encuentra el user existente vía `account (providerId='steam', accountId=sid)`.
  - Se actualiza `user.name` y `user.image` solo si cambiaron (evita writes innecesarios).
  - `player_profiles.userId` UNIQUE + `onConflictDoNothing` → la fila se crea la primera vez y NUNCA se sobrescribe. `steamTradeUrl`, `isPrivate`, `shippingAddress` se conservan.
  - Historial en `coin_transactions`, `giveaway_entries`, `mission_claims`, `redemptions` intacto — todos referencian por `userId`.

- **Race condition** con dos callbacks concurrentes: el UNIQUE de `account (providerId, accountId)` + `player_profiles (userId)` + `player_profiles (steamId)` bloquea duplicados a nivel DB.

## Cómo probar en local

### Requisitos

1. `.env.local` con `BETTER_AUTH_SECRET`, `DATABASE_URL` (rama dev de Neon), `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
2. **Opcional**: `STEAM_API_KEY` para probar la extracción de nombre/avatar. Sin ella se usa el fallback.
3. Dev server: `npm run dev`.

### Flujo

1. Abre `http://localhost:3000/sorteos/plataforma` (asegúrate de estar sin sesión).
2. Click en **"🎮 Iniciar sesión con Steam"** en la user pill.
3. Redirige a `steamcommunity.com/openid/login` — Steam pide autorización (o directamente autoriza si ya tenés sesión en Steam).
4. Vuelve a `http://localhost:3000/api/auth/steam/callback?state=...&openid.mode=id_res&...`.
5. Después del upsert + sesión, redirect a `/sorteos/plataforma` con la user pill ya mostrando nombre + saldo real (`SUM(coin_transactions.amount)`) — 0 la primera vez.

### Verificar en la DB dev

```sql
SELECT id, name, image, role, "emailVerified", email
FROM "user"
WHERE email LIKE 'steam_%@steam.socialpro.internal';

SELECT "userId", "accountId", "providerId"
FROM account
WHERE "providerId" = 'steam';

SELECT id, user_id, steam_id, is_private, steam_trade_url
FROM player_profiles;
```

Debe existir 1 fila por cada login (idempotente en reintentos).

### Cerrar sesión

Menú de usuario → **"Cerrar sesión"** dispara la server action `steamLogout` (`src/features/giveaway-platform/actions/steamLogout.ts`) que llama a `auth.api.signOut` y redirige.

## Limitaciones conocidas

- Los tests unitarios estáticos verifican estructura, seguridad y contratos del plugin (URLs, params OpenID, extracción SteamID, verificación mockeada, degradación sin API key, no-secret-leaks). **No hay un test e2e** que ejerza el flujo callback completo — requiere levantar un runtime OpenID mock, fuera del scope de PR.
- El email placeholder es único por SteamID pero no verificado. Si en el futuro añadimos email real (opcional en perfil), se cambia allí.
- Kick binding, admin panel y flujo de reset son fuera del scope de este PR.
