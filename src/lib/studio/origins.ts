/** Dedicated entry point; keep marketing canonical URLs on socialpro.es. */
export const STUDIO_APP_ORIGIN = 'https://app.socialpro.es';

/** Exact public origins only. Never trust Host / X-Forwarded-Host as an allowlist. */
export function isStudioUploadOrigin(origin: string, siteUrl: string): boolean {
  return origin === new URL(siteUrl).origin || origin === STUDIO_APP_ORIGIN;
}
