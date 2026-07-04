# Misiones YouTube — verificación de suscripción y comentarios

**Estado:** Documento técnico + auditoría — 2026-07-04
**Ámbito:** fase de investigación previa a implementación.
**Autor:** producto (redacción técnica).

> ⚠️ **NO hay MVP funcional en este PR.** Solo documentación técnica + plan.
> No se conceden puntos por misiones YouTube en producción hasta que
> se complete el plan descrito abajo. Cualquier misión YouTube visible
> hoy es placeholder "Próximamente".

---

## 1. Qué se puede verificar hoy con YouTube Data API v3

Con el scope `https://www.googleapis.com/auth/youtube.readonly` (OAuth
del usuario), la API expone:

| Verificación | Endpoint | Coste (units) | Devuelve |
|---|---|---|---|
| Channel ID del usuario | `channels.list?mine=true&part=id` | 1 | `id` del canal del usuario autenticado |
| Suscripción del usuario a un canal | `subscriptions.list?mine=true&forChannelId=X` | 1 | `items[]` vacío = no suscrito. Con elementos = suscrito |
| Comentarios en un vídeo público | `commentThreads.list?videoId=X&part=snippet&maxResults=100` | 1 por página | Autor, texto y timestamp de comentarios top-level |

**Cuota por defecto**: 10.000 units/día por proyecto Google. Ampliable a
petición, con justificación.

**Referencias oficiales**:
- [YouTube Data API v3 — Quota Cost](https://developers.google.com/youtube/v3/getting-started#quota)
- [subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list)
- [commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list)
- [channels.list](https://developers.google.com/youtube/v3/docs/channels/list)

---

## 2. Qué NO se puede verificar (o requiere trabajo extra)

- **"Like" en un vídeo**: `videos.rate` es de escritura. Verificar likes
  de un usuario concreto requiere iterar `videos.list?myRating=like` con
  scope `youtube.readonly` — funciona pero es enumeración lenta.
- **Comentario en tiempo real**: no hay webhook. Verificación puntual solo.
- **Comentarios de shorts**: mismo endpoint `commentThreads`, no diferencia.
- **Reproducciones/watchtime**: NO se puede verificar por usuario. Solo
  agregados del propietario del canal via `youtubeAnalytics`.
- **Interacciones en directo/chat en streaming**: requiere scopes
  distintos y no cubre este documento.

---

## 3. Scopes necesarios

Único scope requerido: `https://www.googleapis.com/auth/youtube.readonly`.

**Clasificación por Google**: **Sensitive**. Consecuencias:

- **Modo "testing"** en Google Cloud Console: hasta **100 usuarios**
  whitelisted en la pestaña de usuarios de prueba. Sin verificación
  formal. Adecuado para MVP interno.
- **Modo "production"**: requiere **OAuth verification** de Google:
  - Homepage pública con dominio verificado (socialpro.es).
  - Política de privacidad accesible desde la homepage.
  - Video demo mostrando el flujo de conexión + uso del scope.
  - Documentación técnica del uso.
  - Proceso administrativo con Google. Puede tardar **semanas**.

> **NO** solicitar scopes adicionales innecesarios. Especialmente
> prohibido: `youtube` (escritura), `youtube.force-ssl` (restricted),
> `youtube.upload` (restricted → verificación aún más estricta).

---

## 4. Datos que guardaríamos

Nueva tabla propuesta (requiere migración — NO se aplica hoy):

```sql
CREATE TABLE connected_social_accounts (
  id                       SERIAL PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider                 VARCHAR(20) NOT NULL,           -- 'youtube'
  provider_user_id         VARCHAR(64) NOT NULL,           -- YouTube channel ID
  access_token_encrypted   TEXT NOT NULL,
  refresh_token_encrypted  TEXT,
  scope                    TEXT NOT NULL,
  expires_at               TIMESTAMPTZ,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at          TIMESTAMPTZ,
  UNIQUE (user_id, provider)
);

CREATE INDEX ON connected_social_accounts (user_id);
CREATE INDEX ON connected_social_accounts (provider, provider_user_id);
```

Ampliación de `platform_missions`:

```sql
ALTER TABLE platform_missions
  ADD COLUMN provider           VARCHAR(20),
  ADD COLUMN target_channel_id  VARCHAR(64),
  ADD COLUMN target_video_id    VARCHAR(20),
  ADD COLUMN verification_mode  VARCHAR(30);
-- verification_mode: 'youtube_subscribe' | 'youtube_comment' | 'youtube_subscribe_comment'
```

Nada de esto se aplica sin OK explícito (ver §11).

---

## 5. Cifrado de tokens

Los tokens de OAuth deben ir cifrados en DB. Better Auth **no** cifra
tokens en su tabla `account` por defecto — lo hacemos nosotros.

**Utility propuesta** (a implementar en la fase 2):

```
src/lib/crypto/token-encryption.ts
  encrypt(plaintext: string): string   → AES-256-GCM con TOKEN_ENCRYPTION_KEY
  decrypt(ciphertext: string): string  → verifica auth tag antes de devolver
```

Env var nueva:

```
TOKEN_ENCRYPTION_KEY   # 32 bytes hex — generar con: openssl rand -hex 32
```

**Nunca loggear tokens.** El logger debe filtrar patrones `access_token`,
`refresh_token`, `Bearer …` y similares. Ya lo hacemos con otras claves
(STEAM_API_KEY, KEYDROP_ZACKETIZOR_API_KEY) — tests estructurales lo
bloquean.

---

## 6. Env vars necesarias

Bloque completo a añadir en `src/lib/env.ts` en la fase de implementación:

```
# Google Cloud OAuth 2.0 client (para YouTube Data API v3)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URL          # ej: https://socialpro.es/api/auth/callback/google

# YouTube Data API — llamadas server-to-server públicas (opcional, complementa OAuth)
YOUTUBE_API_KEY

# Cifrado de tokens en DB (32 bytes hex)
TOKEN_ENCRYPTION_KEY
```

Nombres tentativos — respetar el estilo del repo (SNAKE_CASE upper). Todas
`server-only` en `env.ts` `server: { … }`.

---

## 7. Cómo configurar en Google Cloud (owner)

Pasos para el owner (Kevin) tras aprobar seguir:

1. **Crear proyecto** en https://console.cloud.google.com.
2. **APIs & Services → Library** → habilitar "YouTube Data API v3".
3. **OAuth consent screen**:
   - Tipo: External.
   - App name: SocialPro Giveaways.
   - Support email: info@socialpro.es.
   - App logo (opcional).
   - App domain: socialpro.es.
   - Authorized domains: socialpro.es.
   - Developer contact: info@socialpro.es.
   - Scopes: **solo** `https://www.googleapis.com/auth/youtube.readonly`.
4. **OAuth 2.0 Client IDs → Create credentials**:
   - Type: Web application.
   - Authorized redirect URIs: `https://socialpro.es/api/auth/callback/google`
     (y su equivalente localhost para dev).
5. Copiar Client ID + Client Secret a `.env.local` y Vercel (server-only).
6. **Añadir hasta 100 test users** en la pestaña "Test users" hasta que
   se complete la OAuth verification.
7. Cuando se decida pasar a producción abierta: solicitar OAuth
   verification desde la misma consola. Preparar video demo.

---

## 8. Modelo de flujo (MVP fase 2)

Este flujo NO existe hoy. Es el diseño propuesto para la fase 2, tras
aprobar migraciones + OAuth + verificación Google.

```
Usuario en /sorteos/[creator]#misiones → ve card "Suscríbete al canal ZACKETIZOR"

  ¿tiene conectada su cuenta YouTube?
  ├─ NO → botón "Conectar YouTube"
  │       └─ redirect a /api/auth/social/youtube/connect
  │            └─ Google OAuth consent (scope youtube.readonly)
  │                 └─ callback /api/auth/social/youtube/callback
  │                      ├─ exchange code → tokens
  │                      ├─ get channelId con channels.list?mine=true
  │                      ├─ insert/update connected_social_accounts (cifrado)
  │                      └─ redirect a /sorteos/[creator]#misiones
  │
  └─ SÍ → botón "Verificar misión"
         └─ server action `verifyYoutubeMission(missionId)`
              ├─ session guard (userId de sesión)
              ├─ rate limit: max 1 verificación cada 30s por (user, mission)
              ├─ leer connected_social_accounts (descifrar tokens)
              ├─ si expiró: refresh token
              ├─ según mission.verification_mode:
              │   'youtube_subscribe'          → subscriptions.list forChannelId=target
              │   'youtube_comment'            → commentThreads.list videoId=target + filter authorChannelId==user
              │   'youtube_subscribe_comment'  → ambos, ambos deben pasar
              ├─ si CUMPLE ambos gates:
              │   ├─ INSERT mission_claims (UNIQUE bloquea doble claim)
              │   ├─ INSERT coin_transactions +rewardCoins source='mision'
              │   └─ devolver { ok: true, rewardCoins }
              └─ si NO CUMPLE:
                  └─ devolver { ok: false, code: 'not_subscribed' | 'no_comment' | 'rate_limited' }
```

---

## 9. UI esperada (fase 2)

Card de misión con estados:

| Estado | Copy | Botón |
|--------|------|-------|
| Sin cuenta conectada | "Conecta tu cuenta de YouTube para verificar esta misión." | Conectar YouTube |
| Conectada + no verificada | "Suscríbete al canal y comenta en el vídeo. Vuelve y pulsa Verificar." | Verificar misión |
| Verificando (spinner) | "Comprobando con YouTube…" | (loading) |
| Fallo verificación | "Todavía no detectamos [tu suscripción / tu comentario]. Intenta de nuevo en unos segundos." | Verificar misión (habilitado tras cooldown) |
| Cumplida | "Misión completada. Has recibido N puntos." | (deshabilitado) "Completada ✓" |
| Ya reclamada previamente | "Ya has reclamado esta misión." | (deshabilitado) "Completada ✓" |

**Copy legal en la primera pantalla de consent** (redirige a Google OAuth):

```
Si conectas YouTube, usaremos los permisos necesarios para verificar
acciones concretas de misiones (suscripción a un canal y comentarios
en un vídeo). No publicaremos contenido en tu nombre. Puedes desconectar
tu cuenta en cualquier momento desde /sorteos/perfil.
```

---

## 10. Riesgos y prevenciones

| # | Riesgo | Prevención |
|---|--------|-----------|
| R1 | Google OAuth verification bloquea prod si >100 usuarios | Empezar con modo testing + whitelist. Solicitar verification antes de escalar |
| R2 | Filtración de refresh tokens en DB | AES-256-GCM con `TOKEN_ENCRYPTION_KEY`. Utility `encrypt/decrypt`. Test que bloquea grabar tokens en claro |
| R3 | Cuota YouTube API (10K units/día) | Rate limit + cooldown por usuario+misión. En comentarios: limitar a 5 páginas máx (500 comentarios); si no está en las primeras, mostrar "no encontrado, publica de nuevo y reintenta" |
| R4 | Cliente envía `completed=true` | Server siempre verifica con la API. `ok: true` solo tras respuesta positiva de YouTube |
| R5 | Usuario cambia comentario o se desuscribe tras verificar | Verificación es puntual. `mission_claims` refleja el estado en ese momento. Aceptable |
| R6 | Usuarios múltiples con misma cuenta YouTube | UNIQUE `(user_id, provider)` — pero dos usuarios SocialPro distintos pueden compartir cuenta YouTube. Añadir UNIQUE `(provider, provider_user_id)` opcional para prevenir |
| R7 | Legal — Privacidad no menciona YouTube/Google | Actualizar §3 y §4 de Privacidad. Con gestoría (fuera de scope de este doc) |
| R8 | Copy de consent en español no traducible por Google | Los textos de Google OAuth están fijos por Google. El copy propio va en la card previa al botón "Conectar YouTube" |
| R9 | Fallo API (500, timeout, cuota agotada) | No conceder puntos si la API no confirma. Mensaje de error controlado; NO revertir claim si ya se aplicó |

---

## 11. Qué falta configurar en Google Cloud (checklist para owner)

- [ ] Proyecto Google Cloud creado.
- [ ] YouTube Data API v3 habilitada.
- [ ] OAuth consent screen configurada (External + scope único `youtube.readonly` + copy claro).
- [ ] OAuth 2.0 Web Client creado.
- [ ] Redirect URIs configuradas (prod + dev).
- [ ] Client ID + Client Secret guardados en Vercel (server-only).
- [ ] `TOKEN_ENCRYPTION_KEY` generada (`openssl rand -hex 32`) y en Vercel.
- [ ] Test users añadidos (hasta 100 emails autorizados) para MVP.
- [ ] Al escalar >100 usuarios en prod: solicitar OAuth verification.
- [ ] Preparar video demo del flujo de conexión + uso del scope (para
      la petición de verification).
- [ ] Actualizar `/sorteos/privacidad` §3-4 mencionando YouTube/Google
      (con gestoría).

---

## 12. Riesgos legales y privacidad

Cuando lleguemos a la fase 2, hay que actualizar `/sorteos/privacidad`:

- §3 Base jurídica del tratamiento: incluir OAuth de terceros
  (Google/YouTube) como necesario para la ejecución del servicio de
  misiones (art. 6.1.b RGPD).
- §4 Con quién compartimos: añadir Google (Alphabet Inc.) como
  proveedor de identidad/API.
- §5 Transferencias internacionales: Google es US — aplican Cláusulas
  Contractuales Tipo.
- §6 Conservación: tokens hasta que el usuario desconecte + N días
  posteriores para permitir reconexión.

Estos cambios pasan por **gestoría antes de aplicar** — ya en el doc
`docs/legal/socialpro-giveaways-legal-review-spain.md` §7.

---

## 13. Roadmap propuesto (fases)

| Fase | Alcance | Requiere |
|------|---------|----------|
| **Fase 0 · Este doc** | Auditoría técnica + plan | Nada |
| **Fase 1 · UI placeholder (opcional)** | Card "Misiones YouTube · Próximamente" en Misiones. No canjeable | Nada |
| **Fase 2 · Google Cloud + env** | Proyecto Google, OAuth client, env vars, TOKEN_ENCRYPTION_KEY, test users whitelisted | OK owner. Trabajo en consola Google |
| **Fase 3 · Schema + migración** | `connected_social_accounts` + ampliación `platform_missions`. Cifrado tokens | OK owner. Migración Drizzle |
| **Fase 4 · OAuth connect flow** | `/api/auth/social/youtube/{connect,callback,disconnect}`. Cifrado y guardado en DB | Fase 2 + 3 |
| **Fase 5 · Verificación server action** | `verifyYoutubeMission()` con rate limit + gates de subscribe/comment | Fase 4 + copy legal actualizado |
| **Fase 6 · UI misiones YouTube funcional** | Cards con estados reales + copy | Fase 5 |
| **Fase 7 · OAuth verification Google** | Solicitud formal a Google si >100 usuarios | Fase 6 + gestoría |

---

## 14. Qué NO haremos en este PR

- ❌ No hay OAuth Google/YouTube funcional.
- ❌ No hay migración de schema.
- ❌ No hay UI de misión YouTube funcional (opcionalmente, placeholder
  "Próximamente" — decisión del owner).
- ❌ No hay env vars nuevas.
- ❌ No hay claves ni tokens hardcodeados.
- ❌ No hay concesión de puntos por misiones YouTube en producción.
- ❌ No se modifica `/sorteos/privacidad` (queda para gestoría).

---

## 15. Fuentes citadas

- [YouTube Data API v3 — Overview](https://developers.google.com/youtube/v3)
- [YouTube Data API v3 — Quota Cost](https://developers.google.com/youtube/v3/getting-started#quota)
- [Google Identity — OAuth 2.0 Scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Google OAuth App Verification](https://support.google.com/cloud/answer/9110914)
- [subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list)
- [commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list)
- [channels.list](https://developers.google.com/youtube/v3/docs/channels/list)

---

## 16. Historial

- **2026-07-04 v0.1** — Auditoría técnica + plan por fases. Sin código
  funcional. Sin migraciones. Preparación para la fase 2 cuando el
  owner lo apruebe.
