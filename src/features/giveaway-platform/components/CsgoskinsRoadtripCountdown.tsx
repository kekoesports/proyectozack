'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Fecha ISO 8601 con zona horaria de fin del evento. */
  endsAt: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
}

function compute(endsAtMs: number, now: number): Remaining {
  const diff = Math.max(0, endsAtMs - now);
  if (diff === 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true };
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    finished: false,
  };
}

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * Countdown live para el evento del partner CSGO-SKINS.
 *
 * - SSR-safe: durante el primer render calcula el remaining en base a
 *   `Date.now()` del server, y en cliente reemplaza con `useEffect`.
 * - Actualiza cada segundo con `setInterval`. Limpia en unmount.
 * - Cuando el evento termina, muestra "Finalizado" en lugar del contador.
 * - `endsAt` es una prop configurable por card/deal — no está hardcodeado
 *   en el componente. La landing pasa el valor.
 */
export function CsgoskinsRoadtripCountdown({ endsAt }: Props) {
  const endsAtMs = Date.parse(endsAt);
  const [remaining, setRemaining] = useState<Remaining>(() =>
    compute(endsAtMs, Date.now()),
  );

  useEffect(() => {
    if (!Number.isFinite(endsAtMs)) return;
    // Timer que refresca el contador cada segundo — patrón intencional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(compute(endsAtMs, Date.now()));
    const id = window.setInterval(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemaining(compute(endsAtMs, Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAtMs]);

  if (remaining.finished) {
    return (
      <div className="gp-csgo-countdown gp-csgo-countdown-done" aria-live="polite">
        <span className="gp-csgo-countdown-label">Evento finalizado</span>
      </div>
    );
  }

  return (
    <div className="gp-csgo-countdown" aria-live="off">
      <span className="gp-csgo-countdown-days">
        {remaining.days} <b>DÍAS</b>
      </span>
      <span className="gp-csgo-countdown-time" suppressHydrationWarning>
        {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
      </span>
    </div>
  );
}
