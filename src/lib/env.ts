import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    // Optional in dev; required in production for cron endpoints to be reachable.
    CRON_SECRET: z.string().min(8).optional(),
    DEV_ROLE_OVERRIDE: z.enum(['admin', 'manager', 'staff', 'brand', 'editor', 'finance', 'analyst', 'ops', 'talent_manager']).optional(),
    YOUTUBE_API_KEY: z.string().min(1).optional(),
    TWITCH_CLIENT_ID: z.string().min(1).optional(),
    TWITCH_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1).optional(),
    GOOGLE_DRIVE_BACKUP_FOLDER_ID: z.string().min(1).optional(),
    // Bearer token for skill-driven CLI endpoints (/api/admin/discover/*, /api/admin/targets/{import,active}).
    // Optional in dev so the app boots without it; endpoints fail-closed with 503 when absent.
    // Generate with `crypto.randomBytes(32).toString('hex')`.
    TARGETS_IMPORT_TOKEN: z.string().min(32).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).optional(),
    // NewsData.io API key para monitorización de noticias
    NEWSDATA_API_KEY: z.string().min(1).optional(),
    // Sal para el hash de sesión de analytics de posts. Opcional: si no está definida se
    // usa un valor fijo de fallback. Genera con: crypto.randomBytes(32).toString('hex')
    ANALYTICS_SALT: z.string().min(8).optional(),
    // Vercel Blob tokens. Optional: the app boots without them; Blob ops fail gracefully.
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    // Dedicated public-store token for news covers. Falls back to BLOB_READ_WRITE_TOKEN when absent.
    BLOB_READ_WRITE_TOKEN_NEWS: z.string().min(1).optional(),
    // Google Sheets API key for reading public spreadsheets (no OAuth needed).
    GOOGLE_SHEETS_API_KEY: z.string().min(1).optional(),
    // Kill switch del OCR de nóminas. Default false en producción (tesseract.js
    // está roto en Vercel — Cannot find module '..' + timeouts). Solo se invoca
    // tesseract si la variable es exactamente 'true'. Developers pueden setear
    // PAYROLL_OCR_ENABLED=true en .env.local para probar el flujo OCR en local.
    PAYROLL_OCR_ENABLED: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
    // Concurrencia máxima del cron /api/cron/sync-sheet-sources.
    // Cuota Google Sheets v4: 100 reads / 100s / proyecto. Cada tracker hace 2 reads.
    // Con concurrencia=4 → máximo 8 reads simultáneos = bien dentro del límite.
    SHEETS_SYNC_CONCURRENCY: z.coerce.number().int().min(1).max(20).optional().default(4),
    // Steam Web API key para enriquecer el perfil (nombre, avatar) tras el
    // login OpenID. Opcional: sin ella el flujo OpenID sigue funcionando y el
    // usuario se crea con name="Jugador de Steam" y avatar=null.
    // Server-only: nunca se envía al cliente.
    STEAM_API_KEY: z.string().min(1).optional(),
    // KeyDrop Giveaway API — clave del afiliado ZACKETIZOR (ZACKCSGO).
    // Server-only. Opcional en dev: sin ella la sección de sorteos KeyDrop
    // se oculta con degradación silenciosa (no crash, no error visible).
    // Base URL: https://ws-2071.socket-cs.com/v1/giveaway-user
    // Endpoints usados: GET /api/list, GET /api/giveaway/:id
    KEYDROP_ZACKETIZOR_API_KEY: z.string().min(1).optional(),

    // ============================================================
    // Discord Missions Fase A — OAuth de terceros para verificar
    // membresía en un guild. Ver docs/discord-mission-fase-a.md.
    // Todo server-only. Sin estas vars el flujo se degrada:
    // el usuario ve la card pero no puede iniciar OAuth (mensaje
    // "Integración Discord no configurada").
    // ============================================================
    DISCORD_CLIENT_ID: z.string().min(1).optional(),
    DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
    DISCORD_OAUTH_REDIRECT_URL: z.string().url().optional(),
    /**
     * 64 caracteres hex (32 bytes). Generar con: openssl rand -hex 32.
     * Se usa para AES-256-GCM sobre access tokens en DB.
     * SIN esta clave los tokens NO se cifran ni descifran; la utility
     * lanza error controlado y el flow se degrada.
     */
    TOKEN_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
    /**
     * Guild ID + Invite URL para la primera misión ZACKETIZOR.
     * No son secretos (guild ID es público en Discord), pero
     * mantenemos en env para que sea fácil rotar/actualizar por
     * creador sin tocar código.
     */
    DISCORD_ZACKETIZOR_GUILD_ID: z.string().regex(/^\d{17,20}$/).optional(),
    DISCORD_ZACKETIZOR_INVITE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_GTM_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    DEV_ROLE_OVERRIDE: process.env.DEV_ROLE_OVERRIDE,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_DRIVE_BACKUP_FOLDER_ID: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
    TARGETS_IMPORT_TOKEN: process.env.TARGETS_IMPORT_TOKEN,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    NEWSDATA_API_KEY: process.env.NEWSDATA_API_KEY,
    ANALYTICS_SALT: process.env.ANALYTICS_SALT,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    BLOB_READ_WRITE_TOKEN_NEWS: process.env.BLOB_READ_WRITE_TOKEN_NEWS,
    GOOGLE_SHEETS_API_KEY: process.env.GOOGLE_SHEETS_API_KEY,
    PAYROLL_OCR_ENABLED: process.env.PAYROLL_OCR_ENABLED,
    SHEETS_SYNC_CONCURRENCY: process.env.SHEETS_SYNC_CONCURRENCY,
    STEAM_API_KEY: process.env.STEAM_API_KEY,
    KEYDROP_ZACKETIZOR_API_KEY: process.env.KEYDROP_ZACKETIZOR_API_KEY,

    // Discord Missions Fase A
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_OAUTH_REDIRECT_URL: process.env.DISCORD_OAUTH_REDIRECT_URL,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    DISCORD_ZACKETIZOR_GUILD_ID: process.env.DISCORD_ZACKETIZOR_GUILD_ID,
    DISCORD_ZACKETIZOR_INVITE_URL: process.env.DISCORD_ZACKETIZOR_INVITE_URL,

    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  },
  // Treat `VAR=` (empty string) the same as a missing var so optional fields
  // don't fail validation when declared but unset in .env.
  emptyStringAsUndefined: true,
});
