# Variables de entorno — Social accounts (PR-1b-1)

Variables server-only añadidas para el flujo de social linking.
Todas viven en `src/lib/env.ts` con validación Zod. Empty string se trata
como undefined.

## Obligatorias en producción

### `SOCIAL_TOKEN_ENCRYPTION_KEY`

Cifrado AES-256-GCM de los tokens sociales guardados en
`connected_social_accounts`. **32 bytes en base64**.

Generar:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Opcional en dev: la app arranca sin ella, la UI muestra "No configurado
todavía" en las tarjetas sociales y los endpoints `/api/social/*` devuelven
`503 provider_not_configured`.

**Reglas de seguridad**:
- No commitear en repos.
- No loggear.
- Rotación cada 90 días (script futuro `scripts/rotate-social-token-key.ts`).

## Providers activos

### Discord

Crear app en <https://discord.com/developers/applications>.

**Redirect URI** a configurar en el dashboard:
```
{NEXT_PUBLIC_SITE_URL}/api/social/discord/callback
```

Variables:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

Scopes solicitados: `identify guilds guilds.members.read`.

### Google / YouTube

Crear credenciales OAuth 2.0 en
<https://console.cloud.google.com/apis/credentials>.

**Redirect URI** a configurar:
```
{NEXT_PUBLIC_SITE_URL}/api/social/google/callback
```

Variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Scopes solicitados:
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/youtube.readonly`

## Providers planned (no activos en PR-1b-1)

- **X / Twitter** → congelado por coste API v2 Basic ($100/mes).
- **Instagram** → Meta/Basic Display no permite verificar acciones.

Ambos aparecen en la UI como "Próximamente". Los endpoints `/api/social/x/*`
y `/api/social/instagram/*` responden `501 provider_planned`.

## Referencias públicas para PR-1b-2

Estas 2 se documentan aquí pero no se usan aún — se usarán al implementar
misiones sociales verificables (PR-1b-2).

- `DISCORD_GUILD_ID` — id del server SocialPro para misiones "unirse a Discord".
- `YOUTUBE_CHANNEL_ID` — id del canal SocialPro para misiones YouTube.

Ambas opcionales; sin ellas las misiones sociales dependientes fallarán en
tiempo de check.

## Flujo típico setup

```bash
# 1. Genera la key de cifrado
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. En Vercel Dashboard → Settings → Environment Variables:
#    Añade cada variable en Production + Preview + Development
#    Marca "Sensitive" para SECRET y ENCRYPTION_KEY

# 3. Redeploy (Vercel toma las vars en el siguiente build)

# 4. Configura Redirect URIs en Discord + Google con la URL final
```
