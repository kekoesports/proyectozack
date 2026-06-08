import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import { env } from './env';
import { SITE_URL } from './site-url';
import { sendPasswordResetEmail } from './email';

/** Derive www/non-www variants + production domain so auth works regardless of env config. */
function getSiteOrigins(siteUrl: string): string[] {
  const origins = new Set<string>([siteUrl]);
  try {
    const u = new URL(siteUrl);
    if (u.hostname.startsWith('www.')) {
      origins.add(siteUrl.replace('www.', ''));
    } else {
      origins.add(siteUrl.replace('://', '://www.'));
    }
  } catch { /* keep just the original */ }
  // Always include the production domain (handles Vercel preview URL as SITE_URL)
  origins.add('https://socialpro.es');
  origins.add('https://www.socialpro.es');
  return [...origins];
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: SITE_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  database: drizzleAdapter(db, { provider: 'pg' }),
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // refresh once per day
    freshAge: 60 * 60,            // require re-auth after 1h for sensitive ops
  },
  advanced: {
    useSecureCookies: SITE_URL.startsWith('https'),
    defaultCookieAttributes: {
      sameSite: 'lax',
      path: '/',
    },
  },
  trustedOrigins: getSiteOrigins(SITE_URL),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
});
