import { env } from '@/lib/env';

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const SITE_HOST = safeHost(env.NEXT_PUBLIC_SITE_URL);

/**
 * Hosts permitidos para `redirectUrl` generados desde el panel admin
 * (giveaway codes, giveaways propios) y cualquier futuro punto que acepte
 * URLs externas.
 *
 * Diseño:
 * - Incluye `NEXT_PUBLIC_SITE_URL` host por defecto (siempre seguro).
 * - Los hosts de partners aprobados por producto se añaden manualmente en
 *   `PARTNER_HOSTS` abajo. NO se leen de DB ni de input de usuario.
 *
 * Para añadir un nuevo partner: editar `PARTNER_HOSTS` con el hostname
 * exacto (sin protocolo, sin path) y commit. La PR debe llevar aprobación
 * de producto.
 */
const PARTNER_HOSTS = [
  'p.skin.place',
  'hellcase.com',
  'skinsmonkey.com',
] as const;

export const ALLOWED_REDIRECT_HOSTS: readonly string[] = [
  ...(SITE_HOST ? [SITE_HOST] : []),
  ...PARTNER_HOSTS,
];
