import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    /** Endpoint HTTP alternativo para el proxy Neon local de QA. */
    // Se conserva mientras producción siga en Vercel con el driver HTTP de
    // Neon. Deja de leerse en cuanto el cutover termine.
    NEON_HTTP_FETCH_ENDPOINT: z.string().url().optional(),
    // Ajustes del pool de PostgreSQL. Los valores por defecto sirven para un
    // proceso persistente (VPS); en serverless conviene un `max` bajo porque
    // cada instancia abre su propio pool.
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(0).default(30_000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
    // URL con el rol migrador. Si no se define, se usa DATABASE_URL.
    MIGRATION_DATABASE_URL: z.string().url().optional(),
    // Dónde se ESCRIBEN los ficheros. Las lecturas pueden caer al otro
    // proveedor mientras dure la migración (STORAGE_FALLBACK_TO_VERCEL).
    STORAGE_DRIVER: z.enum(['vercel', 'local']).default('vercel'),
    STORAGE_LOCAL_ROOT: z.string().min(1).optional(),
    STORAGE_PUBLIC_URL_BASE: z.string().url().optional(),
    STORAGE_FALLBACK_TO_VERCEL: z.coerce.boolean().default(true),
    RESEND_API_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    // Optional in dev; required in production for cron endpoints to be reachable.
    CRON_SECRET: z.string().min(8).optional(),
    DEV_ROLE_OVERRIDE: z.enum(['admin', 'manager', 'staff', 'brand', 'editor', 'finance', 'analyst', 'ops', 'talent_manager']).optional(),
    YOUTUBE_API_KEY: z.string().min(1).optional(),
    TWITCH_CLIENT_ID: z.string().min(1).optional(),
    TWITCH_CLIENT_SECRET: z.string().min(1).optional(),
    // Kick Developer Public API (app token, client-credentials flow).
    KICK_CLIENT_ID: z.string().min(1).optional(),
    KICK_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1).optional(),
    GOOGLE_DRIVE_BACKUP_FOLDER_ID: z.string().min(1).optional(),
    // Plantilla y carpeta para generar la hoja de seguimiento de un trato.
    // Opcionales: sin ellas la generación no ocurre y el trato se crea igual.
    GOOGLE_DRIVE_DEAL_TEMPLATE_ID: z.string().min(1).optional(),
    GOOGLE_DRIVE_TRACKING_FOLDER_ID: z.string().min(1).optional(),
    /** Webhook n8n que copia la plantilla con el Drive de pcamacho. */
    N8N_DRIVE_COPY_WEBHOOK_URL: z.string().url().optional(),
    // Bearer token for skill-driven CLI endpoints (/api/admin/discover/*, /api/admin/targets/{import,active}).
    // Optional in dev so the app boots without it; endpoints fail-closed with 503 when absent.
    // Generate with `crypto.randomBytes(32).toString('hex')`.
    TARGETS_IMPORT_TOKEN: z.string().min(32).optional(),
    // Token dedicado para las operaciones CRM iniciadas por n8n.
    // Fail-closed: los endpoints /api/automation/* devuelven 503 si falta.
    AUTOMATION_API_TOKEN: z.string().min(32).optional(),
    // Webhook autenticado de n8n que fuerza el envío inmediato a Discord al
    // aprobar un borrador. El Schedule Trigger de n8n sigue siendo el respaldo.
    N8N_DEAL_CREATED_WEBHOOK_URL: z.string().url().optional(),
    // Generación best-effort de un PDF de contrato en estado borrador al
    // aprobar un deal automatizado. Nunca añade firmantes ni envía correos.
    AUTOMATION_CONTRACT_DRAFTS_ENABLED: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
    // Override opcional. Sin él se elige una plantilla activa por sector y se
    // cae a service_agreement/general.
    AUTOMATION_CONTRACT_TEMPLATE_ID: z.coerce.number().int().positive().optional(),
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
    // KeyDrop Giveaway API — clave del afiliado IMANTADO. Mismo endpoint
    // base y auth (x-api-key) que ZACKETIZOR. Un secreto por par
    // creador+provider (regla del onboarding doc §1).
    KEYDROP_IMANTADO_API_KEY: z.string().min(1).optional(),
    // KeyDrop Giveaway API — clave del afiliado NAOW. Un secreto por par
    // creador+provider.
    KEYDROP_NAOW_API_KEY: z.string().min(1).optional(),
    // KeyDrop Giveaway API — clave del afiliado TODOCS2. Un secreto por par
    // creador+provider.
    KEYDROP_TODOCS2_API_KEY: z.string().min(1).optional(),

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
     * Clave paralela durante una rotación controlada. Mientras exista, las
     * escrituras nuevas usan esta clave y las lecturas aceptan ambas. Nunca se
     * envía en una request: la rotación ocurre completamente en el servidor.
     */
    TOKEN_ENCRYPTION_KEY_NEXT: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
    /** Bearer exclusivo y temporal para ejecutar la rotación una sola vez. */
    TOKEN_ENCRYPTION_ROTATION_TOKEN: z.string().min(32).optional(),
    /** Kill switch explícito para el endpoint de re-cifrado de tokens. */
    TOKEN_ENCRYPTION_ROTATION_ENABLED: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
    /**
     * Guild ID + Invite URL para la primera misión ZACKETIZOR.
     * No son secretos (guild ID es público en Discord), pero
     * mantenemos en env para que sea fácil rotar/actualizar por
     * creador sin tocar código.
     */
    DISCORD_ZACKETIZOR_GUILD_ID: z.string().regex(/^\d{17,20}$/).optional(),
    DISCORD_ZACKETIZOR_INVITE_URL: z.string().url().optional(),

    // ============================================================
    // Twitch Missions Fase B — OAuth de usuario para verificar
    // follow al canal objetivo. Ver docs/twitch-mission-fase-b.md.
    //
    // TWITCH_CLIENT_ID/SECRET ya existían para el servicio
    // server-to-server (app token, cron /sync-metrics, /poll-live).
    // La misma app Twitch se puede reutilizar para user OAuth aquí.
    // ============================================================
    /**
     * Callback URL para el flujo OAuth de usuario Twitch. Distinta por
     * entorno (prod / preview / dev). Debe coincidir EXACTA con la
     * OAuth Redirect URL declarada en dev.twitch.tv → Console →
     * Applications → tu app → OAuth Redirect URLs.
     */
    TWITCH_OAUTH_REDIRECT_URL: z.string().url().optional(),
    /**
     * Broadcaster ID (Helix user ID, numérico) del canal ZACKETIZOR.
     * Público — se obtiene con `GET /helix/users?login=zacketizor`.
     * No es secreto.
     */
    TWITCH_ZACKETIZOR_BROADCASTER_ID: z.string().regex(/^\d{1,20}$/).optional(),
    /**
     * URL pública del canal Twitch — para el CTA "Abrir Twitch".
     * Debe ser una URL twitch.tv/<login> válida.
     */
    TWITCH_ZACKETIZOR_CHANNEL_URL: z.string().url().optional(),

    // ============================================================
    // Zack Agent OS — fundación del runtime de agentes.
    // Ver docs/agent-os/architecture.md y docs/adr/0006.
    //
    // Todos los defaults son seguros: sin tocar nada, el sistema
    // queda apagado. Encolar una ejecución falla en cerrado
    // mientras AGENTS_ENABLED no sea exactamente 'true', y los
    // dos secretos son opcionales para que la app arranque sin
    // ellos — los endpoints internos que llegan en PR 3-5
    // responden 503 en su ausencia, nunca abren.
    // ============================================================
    /**
     * Kill switch global. Mismo patrón que PAYROLL_OCR_ENABLED:
     * solo la cadena exacta 'true' enciende el sistema.
     */
    AGENTS_ENABLED: z.enum(['true', 'false']).optional().default('false').transform((v) => v === 'true'),
    /**
     * Bearer de máquina para /api/internal/agents/* (worker y collectors).
     * Deliberadamente distinto de AUTOMATION_API_TOKEN: n8n y el worker no
     * comparten superficie ni rotación.
     * Generar con `crypto.randomBytes(32).toString('hex')`.
     */
    AGENT_INTERNAL_TOKEN: z.string().min(32).optional(),
    /** Firma HMAC de los eventos entrantes, con protección de replay. */
    AGENT_EVENT_HMAC_SECRET: z.string().min(32).optional(),
    /** Techo de gasto global mensual. 1 USD = 1.000.000 micros → 10 USD. */
    AGENT_GLOBAL_MONTHLY_BUDGET_MICROS: z.coerce.number().int().min(0).default(10_000_000),
    /** Intervalo de sondeo de la cola por el worker (PR 3). */
    AGENT_WORKER_POLL_MS: z.coerce.number().int().min(250).max(60_000).default(2_000),
    /** Duración del lease. El heartbeat lo renueva cada ~1/4 de este valor. */
    AGENT_LEASE_SECONDS: z.coerce.number().int().min(15).max(3_600).default(60),
    /** Ejecuciones simultáneas por worker. */
    AGENT_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(1),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_GTM_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEON_HTTP_FETCH_ENDPOINT: process.env.NEON_HTTP_FETCH_ENDPOINT,
    DB_POOL_MAX: process.env.DB_POOL_MAX,
    DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS,
    DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS,
    DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS,
    MIGRATION_DATABASE_URL: process.env.MIGRATION_DATABASE_URL,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
    STORAGE_PUBLIC_URL_BASE: process.env.STORAGE_PUBLIC_URL_BASE,
    STORAGE_FALLBACK_TO_VERCEL: process.env.STORAGE_FALLBACK_TO_VERCEL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    DEV_ROLE_OVERRIDE: process.env.DEV_ROLE_OVERRIDE,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
    KICK_CLIENT_ID: process.env.KICK_CLIENT_ID,
    KICK_CLIENT_SECRET: process.env.KICK_CLIENT_SECRET,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_DRIVE_BACKUP_FOLDER_ID: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
    GOOGLE_DRIVE_DEAL_TEMPLATE_ID: process.env.GOOGLE_DRIVE_DEAL_TEMPLATE_ID,
    GOOGLE_DRIVE_TRACKING_FOLDER_ID: process.env.GOOGLE_DRIVE_TRACKING_FOLDER_ID,
    N8N_DRIVE_COPY_WEBHOOK_URL: process.env.N8N_DRIVE_COPY_WEBHOOK_URL,
    TARGETS_IMPORT_TOKEN: process.env.TARGETS_IMPORT_TOKEN,
    AUTOMATION_API_TOKEN: process.env.AUTOMATION_API_TOKEN,
    N8N_DEAL_CREATED_WEBHOOK_URL: process.env.N8N_DEAL_CREATED_WEBHOOK_URL,
    AUTOMATION_CONTRACT_DRAFTS_ENABLED: process.env.AUTOMATION_CONTRACT_DRAFTS_ENABLED,
    AUTOMATION_CONTRACT_TEMPLATE_ID: process.env.AUTOMATION_CONTRACT_TEMPLATE_ID,
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
    KEYDROP_IMANTADO_API_KEY: process.env.KEYDROP_IMANTADO_API_KEY,
    KEYDROP_NAOW_API_KEY: process.env.KEYDROP_NAOW_API_KEY,
    KEYDROP_TODOCS2_API_KEY: process.env.KEYDROP_TODOCS2_API_KEY,

    // Discord Missions Fase A
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    DISCORD_OAUTH_REDIRECT_URL: process.env.DISCORD_OAUTH_REDIRECT_URL,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    TOKEN_ENCRYPTION_KEY_NEXT: process.env.TOKEN_ENCRYPTION_KEY_NEXT,
    TOKEN_ENCRYPTION_ROTATION_TOKEN: process.env.TOKEN_ENCRYPTION_ROTATION_TOKEN,
    TOKEN_ENCRYPTION_ROTATION_ENABLED: process.env.TOKEN_ENCRYPTION_ROTATION_ENABLED,
    DISCORD_ZACKETIZOR_GUILD_ID: process.env.DISCORD_ZACKETIZOR_GUILD_ID,
    DISCORD_ZACKETIZOR_INVITE_URL: process.env.DISCORD_ZACKETIZOR_INVITE_URL,

    // Twitch Missions Fase B
    TWITCH_OAUTH_REDIRECT_URL: process.env.TWITCH_OAUTH_REDIRECT_URL,
    TWITCH_ZACKETIZOR_BROADCASTER_ID: process.env.TWITCH_ZACKETIZOR_BROADCASTER_ID,
    TWITCH_ZACKETIZOR_CHANNEL_URL: process.env.TWITCH_ZACKETIZOR_CHANNEL_URL,

    // Zack Agent OS
    AGENTS_ENABLED: process.env.AGENTS_ENABLED,
    AGENT_INTERNAL_TOKEN: process.env.AGENT_INTERNAL_TOKEN,
    AGENT_EVENT_HMAC_SECRET: process.env.AGENT_EVENT_HMAC_SECRET,
    AGENT_GLOBAL_MONTHLY_BUDGET_MICROS: process.env.AGENT_GLOBAL_MONTHLY_BUDGET_MICROS,
    AGENT_WORKER_POLL_MS: process.env.AGENT_WORKER_POLL_MS,
    AGENT_LEASE_SECONDS: process.env.AGENT_LEASE_SECONDS,
    AGENT_MAX_CONCURRENCY: process.env.AGENT_MAX_CONCURRENCY,

    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  },
  // Treat `VAR=` (empty string) the same as a missing var so optional fields
  // don't fail validation when declared but unset in .env.
  emptyStringAsUndefined: true,
});
