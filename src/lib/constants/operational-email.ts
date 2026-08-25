/** Cuenta de Google canónica para la operativa comercial de SocialPro. */
export const OPERATIONAL_GOOGLE_EMAIL = 'pcamacho@socialpro.es';

// Resend exige el formato estricto `Nombre <email>`; el separador vertical
// provocaba `validation_error` en producción para respuestas y recordatorios.
export const OPERATIONAL_EMAIL_FROM = `Pablo Camacho - SocialPro <${OPERATIONAL_GOOGLE_EMAIL}>`;
