# Misiones sociales — auditoría Twitch · Kick · Discord

**Estado:** Auditoría técnica + recomendación — 2026-07-04.
**Ámbito:** fase de investigación previa a implementación.
**Autor:** producto (redacción técnica).

> ⚠️ **NO hay MVP funcional en este PR.** Solo documentación técnica y
> recomendación por plataforma. No se conceden puntos por misiones sociales
> hasta que se complete la fase indicada por plataforma. YouTube queda
> aparcado en `docs/youtube-missions-verification.md` — no es parte de este
> documento.

Este documento sustituye a YouTube como candidato de primera fase por
las razones que ya cerramos: scope sensible, verificación formal Google,
cuotas ajustadas y cifrado de tokens sin infraestructura previa.

---

## 1. Discord

### 1.1 Qué se puede verificar

- **Membresía en un servidor concreto** (guild).
- Vía scope OAuth `guilds` + endpoint público — sin necesidad de bot.
- Documentación oficial: [Discord Docs — GET /users/@me/guilds](https://docs.discord.com/developers/resources/user).

### 1.2 Scopes

Suficiente con `identify guilds`:
- `identify` — devuelve `id`, `username`, `avatar` del usuario.
- `guilds` — devuelve **hasta 200 guilds** que tiene el usuario. Filtramos
  localmente por `guild_id` objetivo. La cifra 200 es el **límite dur** de
  Discord (un usuario no puede estar en más de 200 guilds si no tiene
  Nitro, y con Nitro sí, pero el endpoint mete lo que da).

Alternativa más limpia (opcional):
- `guilds.members.read` + `GET /users/@me/guilds/{guild.id}/member` —
  devuelve el objeto miembro (roles, nickname) para un guild concreto.
  Ahorra tirar 200 registros solo para filtrar por id.

**Ninguno de los dos scopes está clasificado como "sensitive" por Discord.**
No requiere revisión formal. Discord permite hasta 100 usuarios en la app
sin verificación oficial; escalar a >100 usuarios requiere completar el
"App verification" de Discord — es más ligero que el de Google.

### 1.3 ¿Necesita bot en el servidor?

**No**, si usas el scope `guilds`. El servidor no tiene que tener a nuestra
app añadida como bot. Le basta al usuario con estar en el guild.

Con `guilds.members.read` **tampoco** — es scope de usuario sobre su propio
membership.

### 1.4 Env vars necesarias

Todas server-only, mismo patrón que el resto:

```
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URL     # ej: https://socialpro.es/api/auth/social/discord/callback
```

Y compartido con Twitch (y con la futura fase 2 YouTube):

```
TOKEN_ENCRYPTION_KEY           # 32 bytes hex (openssl rand -hex 32)
```

### 1.5 Migración necesaria

- Tabla nueva `connected_social_accounts` (compartida para todas las
  plataformas — no una por plataforma).
- Ampliación de `platform_missions` con `provider`, `target_id`,
  `verification_mode`.

Detalle en §5 Modelo de datos común.

### 1.6 Rate limits

Discord tiene rate limit global de 50 req/s por bot y OAuth endpoints
separados con límites propios. Con verificación puntual por usuario
(no repetitiva) estamos muy lejos del techo.

### 1.7 Dificultad

**Baja.** Es el candidato más simple:
- Flow OAuth estándar.
- 1 endpoint para verificar membresía.
- No requiere bot ni relación previa entre nuestra app y el servidor.
- Copy legal claro ("solo verificamos si estás en el servidor X").

### 1.8 Recomendación Discord

🟢 **Implementar primero.**

Riesgo bajo, curva de aprendizaje corta, valor añadido inmediato para
creadores con comunidad Discord.

---

## 2. Twitch

### 2.1 Qué se puede verificar

- **Que un usuario sigue a un canal concreto**. Endpoint verificable con
  user access token.
- Documentación: [GET /helix/channels/followed](https://dev.twitch.tv/docs/api/reference/#get-followed-channels).
- Con params `user_id=X&broadcaster_id=Y` devuelve **1 fila si sigue,
  vacío si no**. No hay que iterar toda la lista.

**Suscripciones de pago/Prime**:
- Endpoint existe (`GET /helix/subscriptions`) pero requiere scope
  `user:read:subscriptions` (usuario) o `channel:read:subscriptions`
  (broadcaster). El scope de usuario es **restricted** — Twitch pide
  aprobación para usarlo en apps públicas.
- Verificar subs de otro creador desde nuestro server requeriría que **el
  broadcaster también conecte su cuenta** con `channel:read:subscriptions`,
  o depender del scope de usuario del suscriptor.

Riesgo de complicación alta para MVP → **empezamos por follow, no subscription.**

### 2.2 Scopes (para follow)

- `user:read:follows` — scope estándar, no sensible. Suficiente para
  verificar si el usuario sigue a un canal.

### 2.3 ¿Necesita broadcaster token?

**No para verificar follow**. Con el user token del suscriptor SocialPro
alcanza. El broadcaster solo tiene que existir con su `broadcaster_id`
(que ya tenemos en el CRM porque hacemos sync de rosters).

### 2.4 Env vars necesarias

Ya existen en el repo como opcionales (verificado en `src/lib/env.ts`
líneas 13-14):

```
TWITCH_CLIENT_ID       # ya en env
TWITCH_CLIENT_SECRET   # ya en env
```

Añadir:

```
TWITCH_OAUTH_REDIRECT_URL   # ej: https://socialpro.es/api/auth/social/twitch/callback
```

Y compartido:

```
TOKEN_ENCRYPTION_KEY
```

### 2.5 Migración necesaria

Igual que Discord: `connected_social_accounts` compartida + ampliación
de `platform_missions`.

### 2.6 Rate limits

Twitch Helix aplica **800 puntos/minuto por app** (~13 req/s), muy
generoso para verificación puntual. Cada llamada consume 1 punto.

### 2.7 Integración existente

En `src/lib/services/twitch.ts` ya tenemos:
- Cliente Helix con **App Access Token** (client_credentials).
- Cache de token + refresh automático.
- Endpoints usados: `search/channels`, `streams`, `channels`, `users`.

Para follow verificable hace falta añadir un **flujo de User Access Token**
(OAuth con `code` grant) — es infraestructura nueva, no cliente nuevo.
Reutilizar `TWITCH_CLIENT_ID/SECRET` existentes.

### 2.8 Dificultad

**Media.** Requiere User Access Token flow (nuevo) + gestión de refresh
tokens (aún no lo hacemos). El endpoint de verificación es un one-shot
simple.

### 2.9 Recomendación Twitch

🟡 **Implementar segundo, tras Discord.**

Ideal para replicar el flujo OAuth ya montado con Discord. Verificación
solo de **follow** (no subscription) para MVP.

---

## 3. Kick

### 3.1 Qué se puede verificar hoy

**Muy poco.** El [Kick Public API](https://docs.kick.com/) lanzada en 2024
tiene endpoints limitados. Confirmado con el índice oficial `apis/channels`
en el repo `KickEngineering/KickDevDocs`:

Endpoints disponibles:
- `GET /public/v1/channels` — info de canal por broadcaster_user_id o slug.
- `PATCH /public/v1/channels` — actualizar metadata del propio directo.

**NO existe endpoint para**:
- Listar los canales que un usuario sigue.
- Verificar que un usuario X sigue al canal Y.
- Consultar el `follower_count` de terceros.

### 3.2 OAuth Kick

- OAuth 2.1 con PKCE. Documentado en `id.kick.com`.
- Scopes disponibles: `user:read`, `channel:read`, `channel:write`,
  `chat:write`, `events:subscribe`.
- **Ninguno cubre la relación "user follows channel"**.

### 3.3 Alternativa: scraping

Prohibido por regla propia (`no scraping runtime en producción`) — además
frágil, riesgo de baneo IP, sin soporte oficial.

### 3.4 Env vars necesarias

Cuando exista API viable:

```
KICK_CLIENT_ID
KICK_CLIENT_SECRET
KICK_OAUTH_REDIRECT_URL
```

Hoy no hace falta añadirlas — no las usamos.

### 3.5 Dificultad

**Bloqueada por API.** No es cuestión de dificultad de implementación:
sencillamente **el endpoint necesario no existe todavía**.

### 3.6 Recomendación Kick

🔴 **Aparcar como placeholder "Verificación pendiente de API oficial".**

- Mantener seguimiento de novedades en
  [github.com/KickEngineering/KickDevDocs](https://github.com/KickEngineering/KickDevDocs)
  changelog.
- Cuando Kick añada `GET /users/@me/followed-channels` o equivalente,
  retomamos.
- Mientras, la card puede aparecer visualmente pero **sin recompensa
  activa** y sin flow de canje.

---

## 4. Seguridad común

Aplicable a Discord y Twitch cuando se implementen. Kick queda fuera
por ahora.

1. `userId` sale de `requirePlayerSession()`. Nunca del cliente.
2. El cliente **no puede** mandar `completed=true`. Server verifica
   con la API en cada intento.
3. Los puntos solo se insertan si la API confirma el gate.
4. `mission_claims.UNIQUE(mission_id, user_id)` bloquea doble claim
   (ya existe en el schema).
5. Rate limit 1 verificación cada 30s por `(user_id, mission_id)` — no
   permitir spam del botón "Verificar".
6. Access/refresh tokens **cifrados AES-256-GCM** con `TOKEN_ENCRYPTION_KEY`.
7. Ningún token nunca aparece en logs. Test estructural bloqueando
   `console.*` sobre tokens.
8. Si la API externa falla (timeout, 5xx, cuota agotada): **no** conceder
   puntos y mensaje de error controlado.
9. Prohibido scraping runtime.
10. No confiar en datos editables por el usuario (ej. username Kick
    escrito a mano) — verificación siempre via OAuth token.

---

## 5. Modelo de datos común

Compartido entre Discord, Twitch y (futuro) Kick / YouTube. **No se aplica
en este PR — requiere migración con OK del owner.**

### 5.1 Nueva tabla `connected_social_accounts`

```sql
CREATE TABLE connected_social_accounts (
  id                       SERIAL PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider                 VARCHAR(20) NOT NULL,          -- 'discord' | 'twitch' | 'kick' | 'youtube'
  provider_user_id         VARCHAR(64) NOT NULL,          -- Discord user id, Twitch user id, etc.
  provider_username        VARCHAR(100),                  -- solo informativo, editable por el usuario en la plataforma origen
  access_token_encrypted   TEXT NOT NULL,
  refresh_token_encrypted  TEXT,                          -- puede ser NULL si el provider no soporta refresh
  scope                    TEXT NOT NULL,
  expires_at               TIMESTAMPTZ,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at          TIMESTAMPTZ,
  UNIQUE (user_id, provider)
);
CREATE INDEX ON connected_social_accounts (user_id);
CREATE INDEX ON connected_social_accounts (provider, provider_user_id);
```

Notas:
- Una cuenta por (user, provider) — bloqueo simple con UNIQUE.
- `disconnected_at` marca la desconexión sin borrar la fila (auditoría).
- `provider_username` solo informativo (para mostrar en `/sorteos/perfil`).

### 5.2 Ampliación de `platform_missions`

```sql
ALTER TABLE platform_missions
  ADD COLUMN provider           VARCHAR(20),         -- 'discord' | 'twitch' | 'kick' | 'youtube'
  ADD COLUMN target_id          VARCHAR(100),        -- guild_id para Discord, broadcaster_id para Twitch, etc.
  ADD COLUMN verification_mode  VARCHAR(30);         -- 'discord_guild' | 'twitch_follow' | 'kick_follow' | 'youtube_subscribe' | 'youtube_comment' | ...
```

Se puede evolucionar sin migración por cada nuevo provider — basta con
añadir el valor al enum `MissionConditionType` / `RewardVerificationMode`.

### 5.3 Reutilización total del ledger

- **Nada** de balances cacheados.
- Puntos van en `coin_transactions` con `source: 'mision'` (ya soportado).
- `mission_claims` con UNIQUE bloquea doble claim (ya soportado).
- `getCoinBalance` sigue siendo `SUM(coin_transactions.amount)`.

**No requiere migración adicional** en las tablas de puntos/misiones
salvo el ALTER de arriba.

---

## 6. UI futura (esbozo — NO implementado)

### 6.1 Discord

```
Card de misión "Únete al Discord de ZACKETIZOR"
  Icono: 🎮 (o el color morado de Discord — sin logo oficial)
  Descripción: "Conecta Discord para verificar tu entrada al servidor."
  Recompensa: 100 puntos
  Estados:
    - Sin cuenta conectada    → Botón "Conectar Discord"
    - Conectada, no verificada → Botón "Verificar misión"
    - Verificando (spinner)    → "Comprobando con Discord…"
    - Completada               → Botón deshabilitado "Completada ✓"
    - Ya reclamada             → Botón deshabilitado "Completada ✓"
    - Fallo API                → Mensaje: "No hemos podido verificar. Intenta de nuevo."
    - No es miembro            → Mensaje: "Todavía no estás en el servidor. Únete y vuelve a verificar."
```

### 6.2 Twitch

```
Card de misión "Sigue el canal de Twitch de ZACKETIZOR"
  Icono: 📺 (o color morado — sin logo oficial)
  Descripción: "Conecta Twitch para verificar que sigues al creador."
  Recompensa: 100 puntos
  Estados idénticos a Discord con copy adaptado:
    - "Conectar Twitch"
    - "Todavía no detectamos que sigues al canal."
```

### 6.3 Kick

```
Card informativa "Sigue el canal de Kick de ZACKETIZOR"
  Icono: 💚 (verde neutro)
  Descripción: "Verificación pendiente de API oficial. Recompensa próximamente."
  Recompensa: (oculta o "Próximamente")
  Estados:
    - Sólo informativo, sin botón. Igual que el placeholder YouTube actual.
```

---

## 7. Riesgos

| # | Riesgo | Plataforma | Nivel | Mitigación |
|---|--------|------------|-------|-----------|
| R1 | Discord: usuario tiene >200 guilds y no aparece el objetivo en `/users/@me/guilds` | Discord | 🟡 | Usar scope adicional `guilds.members.read` + endpoint `GET /users/@me/guilds/{id}/member`. Fallback al primer approach |
| R2 | Twitch: user cambia de opinión y hace unfollow tras verificar | Twitch | 🟢 | Verificación puntual (documentado en Términos §6) |
| R3 | Tokens en claro en DB | Ambos | 🔴 | AES-256-GCM con `TOKEN_ENCRYPTION_KEY`. Test estructural bloqueando plain-text |
| R4 | Spam del botón Verificar | Ambos | 🟡 | Rate limit 30s (user_id, mission_id) |
| R5 | Cliente envía `completed=true` | Ambos | 🟢 | Server siempre verifica con la API |
| R6 | API cae (5xx, timeout, cuota) | Ambos | 🟡 | No conceder puntos. Mensaje controlado. Retry sin cooldown extra |
| R7 | Kick añade endpoint no oficial y lo usamos por error | Kick | 🟢 | Regla dura: sólo `docs.kick.com`, revisar antes de integrar |
| R8 | Discord app verification bloquea >100 usuarios | Discord | 🟡 | Empezar en modo testing. Solicitar verification cuando toque |
| R9 | Twitch subs de pago requiere scope restricted | Twitch | 🟢 | No implementar subs — solo follow |
| R10 | Legal — Privacidad no menciona Discord/Twitch | Ambos | 🟡 | Actualizar Privacidad §3-4 (queda con gestoría) |

---

## 8. Roadmap por plataforma

### 8.1 Discord (fase A)

| Sub-fase | Alcance |
|---|---|
| A.0 · Este doc | Auditoría + plan |
| A.1 · Registro app Discord | Discord Developer Portal → New Application. OAuth consent con scopes `identify guilds` |
| A.2 · Env vars | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URL`, `TOKEN_ENCRYPTION_KEY` |
| A.3 · Migración | `connected_social_accounts` + ampliación `platform_missions` |
| A.4 · Utility `token-encryption.ts` | AES-256-GCM con `TOKEN_ENCRYPTION_KEY` |
| A.5 · OAuth flow | `/api/auth/social/discord/{connect,callback,disconnect}` |
| A.6 · Server action `verifyDiscordMission()` | Rate limit + `GET /users/@me/guilds`, filtrar por `guild_id` objetivo |
| A.7 · UI real | Card con estados. Reemplaza el placeholder actual de YouTube en Misiones |
| A.8 · Legal | Actualizar Privacidad §3-4 (con gestoría) |
| A.9 · Discord app verification | Solo si >100 usuarios en producción |

### 8.2 Twitch (fase B — arranca cuando A esté en producción con >0 misiones activas)

| Sub-fase | Alcance |
|---|---|
| B.1 · Registro app Twitch OAuth Client | Reusar `TWITCH_CLIENT_ID/SECRET` existentes. Añadir redirect URI |
| B.2 · Env | `TWITCH_OAUTH_REDIRECT_URL` (nueva) |
| B.3 · OAuth flow | `/api/auth/social/twitch/{connect,callback,disconnect}`. Reutilizar utility de cifrado + `connected_social_accounts` |
| B.4 · Server action `verifyTwitchMission()` | Rate limit + `GET /helix/channels/followed?user_id=X&broadcaster_id=Y` |
| B.5 · UI real | Card con estados |
| B.6 · Legal | Ya cubierto en fase A si se hizo bien (mismos providers) |

### 8.3 Kick (fase C — pendiente de Kick)

| Sub-fase | Alcance |
|---|---|
| C.0 · Este doc | Aparcado con seguimiento |
| C.1 · Monitorizar changelog | Suscribirse al repo `KickEngineering/KickDevDocs` |
| C.2 · Retomar cuando exista follow endpoint | Volver a auditar cuando Kick añada `GET /users/@me/followed-channels` o equivalente |

---

## 9. Recomendación final

**Orden de implementación propuesto:**

1. 🟢 **Discord primero** (fase A).
   - Curva más suave, valor añadido inmediato para creadores con comunidad
     Discord, verificación en 1 endpoint sin bot ni scopes sensibles.
2. 🟡 **Twitch segundo** (fase B).
   - Aprovecha OAuth infra ya construida en Discord. Verificación de
     **follow únicamente** — no subs de pago.
3. 🔴 **Kick aparcado** (fase C).
   - Placeholder "Verificación pendiente de API oficial". No dedicar
     tiempo hasta que exista endpoint.

**Cosas que NO debemos hacer:**

- ❌ No conceder puntos por misiones sociales sin API que confirme el gate.
- ❌ No pedir scopes sensibles innecesarios (Twitch subs, Discord bot,
  YouTube upload, etc.).
- ❌ No hacer scraping runtime.
- ❌ No inventar mocks que parezcan verificación real.
- ❌ No guardar tokens sin cifrado.
- ❌ No modificar `/sorteos/privacidad` sin gestoría.
- ❌ No abrir migración hasta OK del owner.

---

## 10. Fuentes citadas

- [Discord Docs — Get Current User Guilds](https://docs.discord.com/developers/resources/user).
- [Twitch API Reference — Get Followed Channels](https://dev.twitch.tv/docs/api/reference/#get-followed-channels).
- [Twitch — Authenticating with Helix](https://dev.twitch.tv/docs/authentication/).
- [Kick Developer Docs (repo oficial)](https://github.com/KickEngineering/KickDevDocs).
- [Kick Public API](https://docs.kick.com/).
- [OAuth 2.0 Best Current Practice — draft-ietf-oauth-security-topics](https://datatracker.ietf.org/doc/draft-ietf-oauth-security-topics/).

---

## 11. Historial

- **2026-07-04 v0.1** — Auditoría inicial Twitch/Kick/Discord. YouTube
  queda fuera (aparcado en su propio doc). Recomendación: empezar por
  Discord.
