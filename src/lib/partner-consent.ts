/**
 * Partner consent — Fase 0 MVP.
 *
 * Registra que el usuario ha aceptado ver comunicación comercial de
 * partners externos (skins marketplace, códigos de bono, etc.) tras
 * confirmar +18 y leer participación responsable.
 *
 * Persistencia MVP: cookie `sp_partner_consent`. Legible server-side y
 * escribible desde una server action cuando el usuario acepta el modal.
 *
 * Migración Fase 1: mover a tabla `user_partner_consents` con timestamp,
 * IP hash y user agent (ver docs/legal/todos-abogado.md).
 */

export const PARTNER_CONSENT_COOKIE = 'sp_partner_consent';
export const PARTNER_CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 días

/**
 * Valor mínimo válido para considerar aceptado el consent.
 * v1 = versión actual del modal. Si cambia el copy o las condiciones,
 * incrementar la versión y el cookie previo dejará de valer → usuario
 * ve el modal de nuevo.
 */
export const PARTNER_CONSENT_VALID_VALUE = 'v1';

/** Parsea el valor crudo del cookie y devuelve true si es válido. */
export function isPartnerConsentGranted(cookieValue: string | null | undefined): boolean {
  return cookieValue === PARTNER_CONSENT_VALID_VALUE;
}

export const PARTNER_CONSENT_COOKIE_OPTS = {
  path:     '/',
  maxAge:   PARTNER_CONSENT_COOKIE_MAX_AGE,
  sameSite: 'lax' as const,
  httpOnly: false, // el modal cliente debe poder leer/limpiar por debug si hace falta
  secure:   process.env.NODE_ENV === 'production',
};
