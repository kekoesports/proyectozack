# Twitch Misiones · Fase B · Setup y Runbook

Fase B añade la segunda misión social **verificable** de SocialPro Giveaways: **"Sigue a ZACKETIZOR en Twitch"** → +100 puntos. Sigue exactamente el patrón de Discord Fase A: OAuth de usuario, verificación real vía Helix, sin scraping y sin endpoints no oficiales.

> **Alcance Fase B:** solo Twitch, solo `follow` (nunca subs de pago), solo un creador (`zacketizor`). Kick sigue aparcado (no expone endpoint público para verificar follow).

## 1. Configuración en Twitch Developer Console

Owner: Zack / SocialPro. Se hace una vez.

1. Entra en https://dev.twitch.tv/console/apps.
2. **Register Your Application**:
   - Name: `SocialPro Giveaways`.
   - **OAuth Redirect URLs** (una por entorno):
     - Producción: `https://socialpro.es/api/auth/social/twitch/callback`
     - Preview: `https://<preview-slug>.vercel.app/api/auth/social/twitch/callback`
     - Local: `http://localhost:3000/api/auth/social/twitch/callback`
   - Category: `Application Integration` (o la que más se aproxime).
   - Client Type: **Confidential** (importante — necesitamos `client_secret`).
3. Copia el **Client ID** que aparece tras crearla → variable `TWITCH_CLIENT_ID`.
4. **New Secret** → genera el **Client Secret** → variable `TWITCH_CLIENT_SECRET`. Sólo se muestra una vez.

> Si ya existe una app Twitch en tu cuenta para el servicio server-to-server (`sync-metrics`, `poll-live-status`), puedes **reutilizar el mismo Client ID/Secret** aquí; solo necesitas asegurarte de que la OAuth Redirect URL de user OAuth también está declarada.

## 2. Broadcaster ID e URL del canal

El `broadcaster_id` es el user ID Helix (numérico) del canal objetivo. Se obtiene una sola vez:

```bash
# 1) Consigue un app access token
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -d "client_id=$TWITCH_CLIENT_ID" \
  -d "client_secret=$TWITCH_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
# → { "access_token": "abcd...", ... }

# 2) Resuelve el login "zacketizor" a su user ID
curl 'https://api.twitch.tv/helix/users?login=zacketizor' \
  -H "Authorization: Bearer <access_token>" \
  -H "Client-Id: $TWITCH_CLIENT_ID"
# → { "data": [{ "id": "1234567890", "login": "zacketizor", ... }] }
```

- Guarda el `id` en env: `TWITCH_ZACKETIZOR_BROADCASTER_ID=1234567890`.
- La URL del canal es simplemente `https://www.twitch.tv/zacketizor` → env `TWITCH_ZACKETIZOR_CHANNEL_URL`.

## 3. Clave de cifrado de tokens (reutilizada)

Fase B **reutiliza** la misma `TOKEN_ENCRYPTION_KEY` que Discord Fase A. No hace falta generar una nueva. Los tokens Twitch se cifran con la misma primitiva AES-256-GCM.

## 4. Env vars completas

3 nuevas de Twitch, más las 2 que ya existían para el servicio server-to-server.

```env
# OAuth Twitch (usuario) — mismos client_id/secret que el servicio de sync.
TWITCH_CLIENT_ID=xxxxxxxxxxxxxxxxx
TWITCH_CLIENT_SECRET=yyyyyyyyyyyyyyyy
TWITCH_OAUTH_REDIRECT_URL=https://socialpro.es/api/auth/social/twitch/callback

# Target ZACKETIZOR (broadcaster_id + URL canal).
TWITCH_ZACKETIZOR_BROADCASTER_ID=1234567890
TWITCH_ZACKETIZOR_CHANNEL_URL=https://www.twitch.tv/zacketizor
```

`TOKEN_ENCRYPTION_KEY` ya está poblada (Fase A).

## 5. Migración

**No hace falta migración nueva.** Fase B reutiliza:
- `connected_social_accounts` (con `provider = 'twitch'`).
- `platform_missions` con `provider`, `target_id`, `target_url`, `verification_mode` (columnas añadidas en `0104`).
- `mission_verification_attempts` para rate limit + auditoría.
- `mission_claims` con su UNIQUE `(mission_id, user_id)`.

## 6. Seed idempotente

```bash
CONFIRM_SEED_TWITCH_MISSION=I_ACCEPT_TWITCH_MISSION \
  npx tsx --env-file=.env.local scripts/seed-twitch-mission-zacketizor.ts
```

Inserta o actualiza la misión con `title = "Sigue a ZACKETIZOR en Twitch"`, `rewardCoins = 100`, `provider = 'twitch'`, `verification_mode = 'twitch_follow_channel'`.

Sin ese guard exacto el script sale con `exit 1`.

## 7. Flujo end-to-end (Player)

1. Jugador entra en `/sorteos` con Steam.
2. Ve la card Twitch de la misión: "Abrir Twitch" + "Conectar Twitch".
3. Pulsa **Conectar Twitch** → `GET /api/auth/social/twitch/connect`:
   - Genera `state` 32 bytes hex.
   - Cookie `sp_twitch_oauth_state` httpOnly + sameSite=Lax + TTL 10 min.
   - Redirige a `https://id.twitch.tv/oauth2/authorize?scope=user:read:follows&force_verify=true&...`.
4. Twitch pide consentimiento y redirige a `/api/auth/social/twitch/callback?code=...&state=...`.
5. El callback:
   - Verifica `state` cookie (CSRF).
   - Intercambia `code` → `access_token` (+ `refresh_token` que **descartamos**).
   - Fetchea `GET /helix/users` (usuario del token) para conseguir `id`, `login`, `display_name`.
   - **Cifra** el `access_token` con AES-256-GCM.
   - `INSERT/UPDATE` en `connected_social_accounts` con `disconnected_at = NULL`, `expires_at = now + expires_in`.
   - Redirige a `/sorteos/perfil?twitch_status=ok`.
6. En la card Twitch de `/sorteos` aparece ahora **"Verificar misión"**.
7. Pulsa **Verificar misión** → server action `verifyTwitchMission`:
   - Sesión Better Auth.
   - Bloquea si ya reclamó (`mission_claims`).
   - Rate limit 30s entre intentos por (mission, user).
   - Cuenta Twitch conectada + token no caducado.
   - Descifra el token.
   - `GET https://api.twitch.tv/helix/channels/followed?user_id=<connected_user_id>&broadcaster_id=<target>` con `Authorization: Bearer` y `Client-Id`.
   - Si `data[]` contiene el `broadcaster_id` → el jugador sigue.
   - **INSERT** en `mission_claims` (UNIQUE evita doble claim en race).
   - **INSERT** en `coin_transactions` con `source='mision'` y `amount=100`.
   - Registra `success` en `mission_verification_attempts`.
   - `revalidatePath('/sorteos', 'layout')`.

Outcomes registrados en `mission_verification_attempts`:

| outcome | significado |
|---|---|
| `success` | seguía el canal y puntos concedidos |
| `not_verified` | Helix confirma que NO sigue el broadcaster objetivo |
| `not_connected` | jugador aún no ha hecho OAuth |
| `token_expired` | token caducado (Twitch ~4h), pedir reconectar |
| `rate_limited` | intento bloqueado por el cooldown 30s |
| `api_error` | fallo temporal Helix (5xx/timeout/rate limit externa) |
| `invalid` | estado inconsistente (misión sin provider, etc.) |

## 8. Seguridad y privacidad

- **Scope mínimo:** `user:read:follows`. NO pedimos `user:read:subscriptions`, ni `chat:*`, ni scopes de moderación.
- **NO subs de pago.** La misión es follow → gratis para el jugador.
- **Token cifrado en reposo:** AES-256-GCM (misma clave que Discord).
- **Fase B NO guarda `refresh_token`.** El access token de Twitch dura ~4h. Cuando caduque, la UI muestra "Reconectar Twitch" y el jugador vuelve a autorizar con un clic. Trade-off aceptado — evita gestionar el ciclo de refresh (que introduce nueva superficie).
- **NO se guarda la lista de canales seguidos.** El endpoint `GET /helix/channels/followed` se llama **con filtro por `broadcaster_id`**, así que Helix solo devuelve la fila relevante (si sigue) o vacío. Se procesa en memoria y se descarta.
- **NO logueamos tokens ni ciphertext.** Los tests estructurales bloquean regresiones.
- **CSRF:** state cookie httpOnly + sameSite=Lax + single-use.
- **Rate limit:** 30s entre intentos por (mission, user), sobre TODOS los intentos.
- **NO scraping.** Solo endpoints oficiales `id.twitch.tv/oauth2` y `api.twitch.tv/helix`.
- **NO endpoints deprecated.** Twitch retiró `/helix/users/follows` en agosto 2023; usamos el sustituto oficial `/helix/channels/followed` con `user:read:follows`.

## 9. Runbook operativo

**Añadir un creador nuevo:**
1. Sacar broadcaster_id con `curl /helix/users?login=<slug>` (paso 2 arriba).
2. Añadir en Vercel + `.env.local`: `TWITCH_<CREATOR>_BROADCASTER_ID` y `TWITCH_<CREATOR>_CHANNEL_URL`.
3. Registrar ambas en `src/lib/env.ts` como `z.string().optional()` con regex adecuada.
4. Añadir `case '<creator-slug>':` en `getTwitchMissionTarget` (`twitch-missions.ts`).
5. Crear seed análogo a `scripts/seed-twitch-mission-zacketizor.ts` para el título correcto.

**Rotar client secret:**
1. Twitch Developer Console → **New Secret** (invalida el actual).
2. Actualizar `TWITCH_CLIENT_SECRET` en Vercel y `.env.local`.
3. Los usuarios ya conectados siguen operando (Helix acepta el `access_token` emitido, no re-verifica el secret).

**Debug de un usuario que no consigue verificar:**
1. `SELECT outcome, attempted_at FROM mission_verification_attempts WHERE user_id = '<sub>' ORDER BY attempted_at DESC LIMIT 10;`.
2. Si `token_expired` reiteradamente → pedir reconexión desde la UI ("Reconectar Twitch").
3. Si `not_verified` reiteradamente → confirmar con `curl` desde tu propia cuenta:
   ```bash
   curl -H "Authorization: Bearer <token>" -H "Client-Id: $TWITCH_CLIENT_ID" \
     "https://api.twitch.tv/helix/channels/followed?user_id=<user>&broadcaster_id=<target>"
   ```

## 10. Qué NO cubre Fase B

- Kick (sigue aparcado; no expone endpoint público para verificar follow).
- YouTube (pendiente de OAuth Google + YouTube Data API v3, no arrancado).
- Subs de pago Twitch (fuera de scope legal/producto).
- Auto-refresh del access token (política: reconexión manual).
- Panel admin para métricas de verificación (usar SQL directo).
- Multi-canal por creador (una misión, un broadcaster).
