'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Botón de login con Steam.
 * - Logo real de Steam (SVG inline) reconocible a primera vista.
 * - Estilo premium coherente con la marca SocialPro (gradiente sp).
 * - Icono + texto centrados verticalmente con spacing controlado.
 *
 * Se usa en UserPill (nav) y en cualquier CTA fuera del pill que quiera
 * invitar al usuario al login. El destino es siempre el endpoint de
 * Better Auth `/api/auth/steam/login` (redirect 302 a Steam OpenID).
 *
 * Preserva el sitio de origen tras el login: si el usuario clica desde
 * `/sorteos/zacketizor?tab=x`, tras el flow Steam OpenID vuelve ahí. El
 * pathname+query se pasa como `?returnTo=` al endpoint, y éste lo persiste
 * en una cookie firmada (`steam_return_to`) durante el flow. Si el prop
 * `returnTo` no llega, se infiere del `usePathname()`+`useSearchParams()`
 * del punto de render. Ver `src/lib/steam/return-to.ts` para las reglas
 * de sanitización — el server valida de nuevo antes de redirigir.
 *
 * **Hash NO se preserva** — el navegador nunca envía el fragment al
 * server, así que es irrecuperable en el flow OpenID. Cualquier
 * `#seccion` se pierde. Preservarlo requeriría interceptar el click y
 * leer `window.location.hash` — fuera de scope de esta PR.
 */

interface Props {
  /** Tamaño del botón. `md` para el nav, `lg` para bloques full-width. */
  size?: 'md' | 'lg';
  className?: string;
  /**
   * Override explícito del `returnTo`. Si se omite, se infiere del
   * `usePathname()`+`useSearchParams()` del componente que lo renderiza.
   * El endpoint sanea ambos casos: cualquier valor fuera de /sorteos cae
   * al fallback `/sorteos`.
   */
  returnTo?: string;
}

export function SteamLoginButton({ size = 'md', className, returnTo }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prioridad: prop explícita > URL actual + query. Si estamos en un
  // contexto sin pathname (SSG, primer render) caemos a `/sorteos` y
  // el server volverá a saneárlo — comportamiento seguro por diseño.
  const inferred = pathname
    ? pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    : '/sorteos';
  const target = returnTo ?? inferred;

  const href = `/api/auth/steam/login?returnTo=${encodeURIComponent(target)}`;

  return (
    <a
      href={href}
      className={`gp-steam-login gp-steam-login-${size}${className ? ' ' + className : ''}`}
      aria-label="Iniciar sesión con Steam"
    >
      <SteamLogo />
      <span className="gp-steam-login-text">
        <span className="gp-steam-login-lead">Iniciar sesión con</span>
        <span className="gp-steam-login-brand">STEAM</span>
      </span>
    </a>
  );
}

/**
 * Logo de Steam simplificado (SVG inline). Blanco puro con círculo que
 * imita la marca oficial — no usa el asset propietario de Valve.
 */
function SteamLogo() {
  return (
    <svg
      className="gp-steam-login-logo"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="20" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20" cy="12" r="1.8" fill="currentColor" />
      <circle cx="11.5" cy="19.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11.5" y1="19.5" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}
