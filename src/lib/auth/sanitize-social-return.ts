const DEFAULT_SOCIAL_RETURN = '/sorteos/perfil';

/**
 * OAuth social solo puede volver a páginas de la plataforma de sorteos.
 * Se valida tanto al crear la cookie como al consumirla: una cookie es
 * entrada no confiable aunque sea httpOnly.
 */
export function sanitizeSocialReturnPath(raw: string | null | undefined): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) return DEFAULT_SOCIAL_RETURN;

  try {
    const parsed = new URL(raw, 'https://socialpro.invalid');
    if (parsed.origin !== 'https://socialpro.invalid') return DEFAULT_SOCIAL_RETURN;
    if (parsed.pathname !== '/sorteos' && !parsed.pathname.startsWith('/sorteos/')) {
      return DEFAULT_SOCIAL_RETURN;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_SOCIAL_RETURN;
  }
}
