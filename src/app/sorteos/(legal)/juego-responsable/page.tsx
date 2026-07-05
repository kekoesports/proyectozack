import { redirect } from 'next/navigation';

/**
 * Ruta legacy — Fase 0 legal.
 * SocialPro no es operador de juego, así que dejamos de usar la denominación
 * "juego responsable" en la plataforma. Redirect definitivo a la nueva página.
 *
 * El redirect también está en `next.config.ts` (permanent 301). Este archivo
 * es cinturón + tirantes por si el config redirect no aplicase.
 *
 * Ver docs/legal-risk-matrix.md.
 */
export default function JuegoResponsableLegacyPage(): never {
  redirect('/sorteos/participacion-responsable');
}
