# Discord Misiones · Fase A · Setup y Runbook

Fase A implementa la primera misión social **verificable** de SocialPro Giveaways: **"Únete al Discord de ZACKETIZOR"** → +100 puntos. La verificación no simula nada: llama en tiempo real a la Discord Data API con el token OAuth del jugador y solo concede los puntos si Discord confirma que es miembro de la guild objetivo.

> **Alcance Fase A:** solo Discord, solo `guild_member` como verificationMode, solo un creador (`zacketizor`). Twitch, Kick y YouTube quedan bloqueados como "Próximamente".

## 1. Configuración en Discord Developer Portal

Owner: Zack / SocialPro. Solo hace falta ejecutar una vez.

1. Entra en https://discord.com/developers/applications.
2. Botón **New Application** → nombre `SocialPro Giveaways` (o similar).
3. En **OAuth2 → General** copia:
   - **Client ID** → variable `DISCORD_CLIENT_ID`.
   - **Client Secret** → variable `DISCORD_CLIENT_SECRET` (se muestra una sola vez, guárdalo).
4. En **OAuth2 → Redirects** añade la **Redirect URI exacta** por entorno:
   - Producción: `https://socialpro.es/api/auth/social/discord/callback`
   - Preview (Vercel): `https://<slug>.vercel.app/api/auth/social/discord/callback` — añade una por cada preview que quieras probar en OAuth real, o usa "test app" separada.
   - Local: `http://localhost:3000/api/auth/social/discord/callback`

   Todas se declaran también en env como `DISCORD_OAUTH_REDIRECT_URL` (una sola URL por entorno; ese es el redirect que la app usa al iniciar el flujo).
5. **NO** actives Bot ni Public Bot. **NO** añadas Bot Scopes. Solo pedimos `identify guilds` como user scopes en el flujo autorize.

## 2. Guild ID e Invite URL

1. Guild ID (snowflake, 17-20 dígitos):
   - En Discord, Ajustes de Usuario → Avanzado → activar **Modo Desarrollador**.
   - Clic derecho sobre el servidor de ZACKETIZOR → **Copiar ID**.
   - Guardar en env: `DISCORD_ZACKETIZOR_GUILD_ID=1234567890...`.
2. Invite URL pública:
   - Menú del servidor → **Invitar a gente** → **Enlace permanente** → copiar.
   - Debe ser un enlace `https://discord.gg/...` o `https://discord.com/invite/...`.
   - Guardar en env: `DISCORD_ZACKETIZOR_INVITE_URL=https://discord.gg/xxxxx`.

## 3. Clave de cifrado de tokens

Los access tokens de Discord se guardan **cifrados** con AES-256-GCM en `connected_social_accounts.access_token_encrypted`. Nunca en claro. Nunca en logs.

Generar la clave (una sola vez, es 32 bytes = 64 hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar en env como `TOKEN_ENCRYPTION_KEY=<64 hex chars>`.

> **Rotación:** si tienes que rotar la clave, primero migra los tokens existentes descifrando con la vieja y cifrando con la nueva, o marca todas las cuentas como desconectadas (`disconnected_at = now()`) y obliga a reconectar. La app no soporta doble clave en Fase A.

## 4. Env vars completas

Todas van en Vercel (Production + Preview + Development) y en `.env.local`.

```env
# OAuth Discord — mismos IDs en todos los entornos, redirect distinto por entorno.
DISCORD_CLIENT_ID=xxxxxxxxxxxxxxxxx
DISCORD_CLIENT_SECRET=yyyyyyyyyyyyyyyy
DISCORD_OAUTH_REDIRECT_URL=https://socialpro.es/api/auth/social/discord/callback

# AES-256-GCM key para cifrar access tokens Discord (32 bytes hex).
TOKEN_ENCRYPTION_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Target por creador (Fase A: solo zacketizor).
DISCORD_ZACKETIZOR_GUILD_ID=1234567890123456789
DISCORD_ZACKETIZOR_INVITE_URL=https://discord.gg/xxxxxxxx
```

## 5. Migración y seed

1. La migración `drizzle/0104_discord_missions_fase_a.sql` añade:
   - Columnas nuevas a `platform_missions`: `provider`, `target_id`, `target_url`, `verification_mode`.
   - Tabla `connected_social_accounts` (una fila por (user, provider)).
   - Tabla `mission_verification_attempts` (auditoría + rate limit).
   - Se aplica automática en cada deploy de Vercel (`npm run migrate`).

2. Seed idempotente de la misión (solo cuando quieras encenderla en prod):
   ```bash
   CONFIRM_SEED_DISCORD_MISSION=I_ACCEPT_DISCORD_MISSION \
     npx tsx --env-file=.env.local scripts/seed-discord-mission-zacketizor.ts
   ```
   Inserta o actualiza la misión con `title = "Únete al Discord de ZACKETIZOR"`, `rewardCoins = 100`, `provider = 'discord'`, `verification_mode = 'discord_guild_member'`.

## 6. Flujo end-to-end (Player)

1. Jugador entra en `/sorteos` con Steam.
2. Ve la card Discord de la misión con dos CTAs: "Abrir Discord" y "Conectar Discord".
3. Al pulsar **Conectar Discord** → `GET /api/auth/social/discord/connect`:
   - La app genera un `state` aleatorio de 32 bytes hex.
   - Lo guarda en cookie `sp_disc_oauth_state` httpOnly + sameSite=Lax + TTL 10 min.
   - Redirige a `https://discord.com/api/oauth2/authorize?scope=identify guilds&...`.
4. Discord pide consentimiento y redirige a `.../api/auth/social/discord/callback?code=...&state=...`.
5. El callback:
   - Verifica el `state` contra la cookie (CSRF).
   - Intercambia `code` por `access_token`.
   - Fetchea `GET /users/@me` para obtener `id`, `username`, `global_name`.
   - **Cifra** el `access_token` con AES-256-GCM.
   - `INSERT/UPDATE` en `connected_social_accounts` con `disconnected_at = NULL`.
   - Redirige a `/sorteos/perfil?discord_status=ok`.
6. En la card Discord de `/sorteos` aparece ahora **"Verificar misión"**.
7. Al pulsar **Verificar misión** → server action `verifyDiscordMission`:
   - Verifica sesión Better Auth.
   - Bloquea si ya reclamó (`mission_claims` UNIQUE).
   - Aplica rate limit 30s entre intentos por (mission, user).
   - Comprueba que la cuenta Discord está conectada.
   - Comprueba que el `access_token` no está caducado.
   - Descifra el token, llama a `GET /users/@me/guilds`.
   - Filtra por `target_id` — si el guild aparece, el jugador está dentro.
   - **INSERT** en `mission_claims` (UNIQUE evita doble claim en races).
   - **INSERT** en `coin_transactions` con `source='mision'` y `amount = mission.reward_coins`.
   - Registra el intento como `success` en `mission_verification_attempts`.
   - `revalidatePath('/sorteos', 'layout')`.

Cualquier fallo intermedio se registra con un `outcome` distinto:
| outcome | significado |
|---|---|
| `success` | verificado y puntos concedidos |
| `not_verified` | Discord API confirma que el jugador NO está en la guild |
| `not_connected` | jugador aún no ha hecho OAuth |
| `token_expired` | token >7 días, hay que reconectar |
| `rate_limited` | intento bloqueado por el cooldown 30s |
| `api_error` | fallo temporal Discord (5xx/timeout/rate limit externa) |
| `invalid` | estado inconsistente (misión sin provider, etc.) |

## 7. Seguridad y privacidad

- **Scopes mínimos:** `identify guilds`. No pedimos email, ni `messages.read`, ni Bot scopes.
- **Token cifrado en reposo:** AES-256-GCM con IV aleatorio de 12 bytes + auth tag de 16 bytes. Formato serializado `v1:<iv-hex>:<ct-hex>:<tag-hex>`.
- **No guardamos refresh_token en Fase A.** El access token vive 7 días; cuando caduque, se pide reconexión.
- **No guardamos la lista de guilds.** Se fetchea en tiempo real al verificar cada misión y se descarta al terminar. Los tests estructurales del callback verifican que no se persiste.
- **No logueamos tokens ni ciphertext.** Los módulos `token-encryption.ts` y `verifyDiscordMission` no ejecutan ningún `console.*`.
- **Soft delete:** `POST /api/auth/social/discord/disconnect` marca `disconnected_at = now()` pero no borra la fila. Los `mission_claims` históricos son firmes — no se revierten. El token queda cifrado en la fila pero deja de servir para nuevas verificaciones.
- **CSRF:** el flujo OAuth se protege con `state` cookie httpOnly single-use.
- **Rate limit:** máximo un intento cada 30s por (mission, user). Se aplica también sobre intentos fallidos (no solo exitosos).

## 8. Runbook operativo

**Añadir un creador nuevo (fase A extendida):**
1. En Discord Developer Portal: seguir usando el mismo App (no cambia).
2. En `.env.local` + Vercel añadir `DISCORD_<CREATOR>_GUILD_ID` y `DISCORD_<CREATOR>_INVITE_URL`.
3. En `src/lib/env.ts`: registrar ambas como `z.string().optional()`.
4. En `src/features/giveaway-platform/constants/discord-missions.ts`: añadir un `case '<creator-slug>':` en `getDiscordMissionTarget`.
5. Crear un seed script análogo a `scripts/seed-discord-mission-zacketizor.ts` para insertar la misión con el título correcto.
6. `PlatformCreatorLanding.tsx` ya lee la config del creador activo — no hay que tocarlo.

**Rotar client secret:**
1. Regenerar el secret en Discord Developer Portal (invalida el actual).
2. Actualizar `DISCORD_CLIENT_SECRET` en Vercel y `.env.local`.
3. Los usuarios ya conectados siguen funcionando (no re-verificamos client secret al usar el access token). Los nuevos flujos OAuth usan el secret nuevo.

**Rotar TOKEN_ENCRYPTION_KEY:**
1. No hay migrador automático en Fase A.
2. Opción rápida: `UPDATE connected_social_accounts SET disconnected_at = NOW() WHERE provider = 'discord' AND disconnected_at IS NULL`.
3. Cambiar `TOKEN_ENCRYPTION_KEY` en Vercel.
4. Los usuarios reconectan y quedan cifrados con la nueva clave.

**Debug de un usuario que no consigue verificar:**
1. Revisar `mission_verification_attempts` filtrando por `user_id` y `attempted_at DESC`. Los últimos 10 intentos con su `outcome` explican qué pasa.
2. Si `outcome = 'token_expired'` reiteradamente, el `access_token` caducó pero la cuenta no está marcada desconectada — pedir al usuario que vuelva a **Conectar Discord**.
3. Si `outcome = 'not_verified'` reiteradamente, el usuario no está en la guild (o abandonó). Comprobar con `curl` desde tu propia cuenta:
   ```bash
   curl -H "Authorization: Bearer <token>" https://discord.com/api/v10/users/@me/guilds
   ```

## 9. Qué NO cubre Fase A

- Twitch, Kick, YouTube (siguen bloqueados como "Próximamente").
- Verificar roles concretos dentro de la guild (solo comprueba pertenencia).
- Refresh tokens y renovación automática (el token caduca → reconexión manual).
- Panel admin para monitorizar métricas de verificación (usar SQL directo mientras tanto).
- Cifrado de columnas metadata (por ahora null; cuando se use, valorar cifrar campos sensibles).
