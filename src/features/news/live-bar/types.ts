/**
 * LiveBar — strip rotativo arriba del hub /news con sensación "live feed
 * editorial". Datos siempre pre-cargados server-side; rotación client-side
 * sin re-fetches. Cero impacto en function executions de Vercel.
 *
 * Si una fuente no aporta dato fiable (sin streams live, sin posts 24h),
 * el item simplemente NO se incluye en el array. Nunca placeholders
 * inventados.
 */
export type LiveBarItemKind =
  | 'streams_live'      // creators CS2 streamando ahora mismo
  | 'matches_preview'   // partido en curso o próximo (PICK_PREVIEWS)
  | 'posts_recent'      // noticias últimas 24h
  | 'editorial_pick'    // pick editorial reciente (Apuesta Segura CS2)
  | 'last_post';        // post más reciente si no hay nada en 24h

export type LiveBarAccent =
  | 'emerald'  // live action
  | 'orange'   // editorial / actualidad
  | 'pink'     // matches en curso
  | 'purple'   // picks confirmados
  | 'blue';    // análisis

export type LiveBarItem = {
  readonly kind: LiveBarItemKind;
  /** Etiqueta corta uppercase a la izquierda, ej. "LIVE", "Hoy", "Pick" */
  readonly label: string;
  /** Texto principal, contenido informativo */
  readonly text: string;
  /** Meta opcional dim a la derecha o debajo en mobile */
  readonly meta: string | null;
  /** Destino al hacer click. null si no clickable */
  readonly href: string | null;
  readonly accent: LiveBarAccent;
};
