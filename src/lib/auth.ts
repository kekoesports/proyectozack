import { betterAuth } from 'better-auth';
import { APIError, isAPIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { db } from './db';
import { env } from './env';
import { SITE_URL } from './site-url';
import { sendPasswordResetEmail } from './email';
import { steamOpenId } from './steam/plugin';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { user as authUser } from '@/db/schema/auth';
import { talentUsers, studioInvitations } from '@/db/schema/studio';
import { sendStudioVerificationEmail } from '@/lib/studio/verification-email';
import { logAuthDiagnostic } from '@/lib/auth-logger';

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
  origins.add('https://app.kekopilot.com');
  return [...origins];
}

export const auth = betterAuth({
  appName: 'SocialPro CRM',
  logger: { log: logAuthDiagnostic },
  onAPIError: { onError: (error) => {
    // better-call otherwise logs raw non-API errors after Better Auth's logger.
    if (isAPIError(error)) return;
    logAuthDiagnostic('error');
    throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Servicio de autenticación no disponible.' });
  } },
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
  emailVerification: {
    sendOnSignUp: false,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url, token }) => {
      if (!env.STUDIO_ENABLED) return;
      const [invite] = await db.select({ id: studioInvitations.id }).from(studioInvitations).where(and(
        eq(studioInvitations.email, user.email.toLowerCase()), isNull(studioInvitations.acceptedAt),
        isNull(studioInvitations.revokedAt), gt(studioInvitations.expiresAt, new Date()),
      )).limit(1);
      if (invite) await sendStudioVerificationEmail(user.email, url, token);
    },
  },
  rateLimit: { customRules: { '/send-verification-email': { window: 3600, max: 3 } } },
  databaseHooks: {
    session: { create: { before: async (session) => {
      const [person] = await db.select({ role: authUser.role }).from(authUser).where(eq(authUser.id, session.userId)).limit(1);
      if (person?.role !== 'creator') return true;
      if (!env.STUDIO_ENABLED) return false;
      const [member] = await db.select({ id: talentUsers.id }).from(talentUsers)
        .where(and(eq(talentUsers.userId, session.userId), eq(talentUsers.active, true))).limit(1);
      if (!member) return false;
      return true;
    } } },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 12,      // refresh twice per day
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
  plugins: [
    twoFactor({
      issuer: 'SocialPro CRM',
      twoFactorCookieMaxAge: 5 * 60,
      trustDeviceMaxAge: 12 * 60 * 60,
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 5,
        durationSeconds: 30 * 60,
      },
    }),
    steamOpenId(),
  ],
});
