import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    RESEND_API_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    // Optional in dev; required in production for cron endpoints to be reachable.
    CRON_SECRET: z.string().min(16).optional(),
    DEV_ROLE_OVERRIDE: z.enum(['admin', 'manager', 'staff', 'brand']).optional(),
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

    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
  },
  // Treat `VAR=` (empty string) the same as a missing var so optional fields
  // don't fail validation when declared but unset in .env.
  emptyStringAsUndefined: true,
});
