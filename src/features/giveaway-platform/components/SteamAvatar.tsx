'use client';

import { useState } from 'react';

interface Props {
  imageUrl: string | null;
  name: string | null;
  size: number;
  className?: string;
}

function initialsFrom(name: string | null): string {
  if (!name) return '·';
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!clean) return '·';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Avatar Steam con fallback premium.
 *
 * Reglas:
 *   - Si `imageUrl` es null / vacío → nunca renderizamos `<img>` roto.
 *     Mostramos iniciales del nombre sobre gradient SP.
 *   - Si `imageUrl` está presente pero el navegador falla al cargarla
 *     (CDN caído, CSP, dominio bloqueado) → `onError` marca el estado y
 *     caemos al mismo placeholder de iniciales. Esto evita el broken
 *     image icon del sistema (que en Windows aparece como cuadrito).
 *   - No usamos next/image para no exigir la config `remotePatterns`
 *     — el `<img>` HTML nativo carga cualquier CDN de Steam.
 *   - Wrapper con `width`/`height` inline + `aspect-ratio 1/1` +
 *     `overflow: hidden`. La imagen dentro es 100% + `object-fit: cover`
 *     → nunca se deforma aunque Steam devuelva un ratio inesperado.
 */
export function SteamAvatar({ imageUrl, name, size, className }: Props) {
  const [failed, setFailed] = useState(false);
  const show = imageUrl && !failed;

  const wrapperStyle = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };

  if (show) {
    return (
      <span
        className={`gp-steam-avatar gp-steam-avatar-photo${className ? ' ' + className : ''}`}
        aria-hidden
        style={wrapperStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="gp-steam-avatar-img"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span
      className={`gp-steam-avatar gp-steam-avatar-fallback${className ? ' ' + className : ''}`}
      aria-hidden
      style={wrapperStyle}
    >
      {initialsFrom(name)}
    </span>
  );
}
